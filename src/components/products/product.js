"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ name: "", comment: "", rating: 0 });
  const [averageRating, setAverageRating] = useState(4);
  const [distribution, setDistribution] = useState({
    excellent: 40,
    good: 30,
    average: 15,
    below_average: 10,
    poor: 5,
  });

  useEffect(() => {
  if (!id) return;
  // Fetch product by ID
  fetch(`http://localhost:5000/api/products/${id}`)
    .then(res => res.json())
    .then(data => {
      setItem(data);
    })
    .catch(err => console.error("Failed to fetch product", err));
  fetch(`http://localhost:5000/api/reviews/${id}`)
    .then(res => res.json())
    .then(data => {
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setDistribution(data.distribution);
    })
    .catch(err => console.error(err));
}, [id]);

  const createArray = (count) => Array.from({ length: count });

 const submitReview = async () => {
  if (newReview.name && newReview.comment && newReview.rating > 0) {
    const payload = {
      productId: id,
      ...newReview
    };

    const res = await fetch(`http://localhost:5000/api/reviews/addNewReview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setNewReview({ name: '', comment: '', rating: 0 });
      const data = await res.json();
      const newReviewFormatted = {
        ...data,
        date: "Just now"
      };
      setReviews(prev => [newReviewFormatted, ...prev.slice(0, 9)]);
      fetch(`http://localhost:5000/api/reviews/${id}`)
        .then(res => res.json())
        .then(data => {
          setAverageRating(data.averageRating);
          setDistribution(data.distribution);
        });
    }
  }
};

const handleAddToCart = async () => {
  const email = localStorage.getItem("email");
  const userId = localStorage.getItem("userId");

  if (!email || !userId) {
    alert("Please log in to add items to cart.");
    router.push("/signin");
    return;
  }

  const res = await fetch("http://localhost:5000/api/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "userId": userId
    },
    credentials:"include",
    body: JSON.stringify({
      productId: item._id,
      name: item.name,
      price: item.price,
      image: item.image
    })
  });

  const data = await res.json();
  if (res.ok) {
    alert("Item added to cart successfully!");
  } else {
    alert(data.message);
  }
};


const detectFood = async () => {
  const imageUrl = `http://localhost:5000/${item.image}`; // image from your Node backend

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], "image.jpg", { type: blob.type });

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("http://localhost:5050/predict", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (res.ok) {
    console.log("Detection result:", data);
    router.push(`/CaloryDisplay?food=${data.prediction}`);
  } else {
    alert("Detection failed: " + data.error);
  }
};


  if (!item) return <div className="text-center text-white mt-10">Loading...</div>;

  return (
    <div className="bg-[#ededed] min-h-screen p-6 text-white">
      {/* Product Card */}
      <div className="bg-[#6F4E37] rounded-lg p-6 mb-6 text-white">
        <h2 className="text-center text-3xl font-bold mb-4">{item.name}</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Carousel */}
          <div className="relative flex items-center justify-center text-black">
            <button className="absolute left-0 bg-white p-2 rounded-full shadow">
              ◀
            </button>
            <img src={`http://localhost:5000/${item.image}`} alt={item.name} className="rounded-lg max-h-96 w-full object-cover" />
            <button className="absolute right-0 bg-white p-2 rounded-full shadow">
              ▶
            </button>
          </div>

          {/* Product Info */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{item.name}</h1>
            <div className="flex justify-center mb-1">
              {createArray(averageRating).map((_, i) => (
                <span key={i} className="text-yellow-400 text-xl">★</span>
              ))}
            </div>
            <p className="mb-3 text-white">({reviews.length} Reviews)</p>
            <div className="text-lg font-bold mb-2">
              <span className="text-pink-600">${item.price}</span>
              <span className="line-through ml-2 text-white">${item.price + 30}</span>
            </div>
            <button className="bg-[#FF4081] text-white py-1 px-4 rounded mb-4 hover:bg-pink-500">
              View Seller Profile
            </button>
            <p className="mb-4 text-white">{item.description}</p>

            {/* <div className="flex gap-3 justify-center mb-4">
              <span>Select Color:</span>
              <span className="w-5 h-5 rounded-full bg-orange-500 border"></span>
              <span className="w-5 h-5 rounded-full bg-green-500 border"></span>
              <span className="w-5 h-5 rounded-full bg-black border"></span>
            </div> */}

            <div className="flex gap-4 justify-center">
              <button className="bg-[#FF4081] text-white px-4 py-2 rounded hover:bg-pink-500">
                Contact Seller
              </button>
              <button className="bg-[#FF4081] text-white px-4 py-2 rounded hover:bg-pink-500"
                onClick={handleAddToCart}>
                Add to Cart
                </button>
                <button className="bg-[#FF4081] text-white px-4 py-2 rounded hover:bg-pink-500" 
                 onClick={() => router.push(`/Order/${id}`)}>
                Place Order
              </button>
              <button className="bg-[#FF4081] text-white px-4 py-2 rounded hover:bg-pink-500"
              onClick={detectFood}>
                detect food
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Summary */}
      <div className="bg-[#6F4E37] text-white rounded-lg p-6 mb-6">
        <h3 className="text-2xl font-bold mb-4 text-center">Reviews</h3>
        <div className="text-center mb-4">
          <h4 className="text-xl font-bold">Overall Rating: {averageRating}</h4>
          <div className="flex justify-center">
            {createArray(averageRating).map((_, i) => (
              <span key={i} className="text-yellow-400 text-xl">★</span>
            ))}
          </div>
          <p>Total: {reviews.length} Reviews</p>
        </div>

        {/* Distribution bars */}
        <div className="space-y-2">
          {["Excellent", "Good", "Average", "Below Average", "Poor"].map((label, i) => {
            const key = label.toLowerCase().replace(" ", "_");
            return (
              <div key={label}>
                <p>{label}</p>
                <div className="w-full bg-[#ededed] rounded h-3">
                  <div
                    className="bg-pink-600 h-3 rounded"
                    style={{ width: distribution[key] + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Individual reviews */}
        <div className="mt-6 space-y-4">
          {reviews.map((review, i) => (
            <div key={i} className="bg-[#ededed] text-black p-4 rounded shadow">
              <div className="flex justify-between font-bold">
                <span>{review.name}</span>
                <span className="text-sm text-gray-500">{review.date}</span>
              </div>
              <div className="flex">
                {createArray(review.rating).map((_, j) => (
                  <span key={j} className="text-yellow-400">★</span>
                ))}
              </div>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>

        {/* Add review form */}
        <div className="mt-8">
          <h4 className="text-xl font-bold mb-4">Add a Review</h4>
          <input
            type="text"
            placeholder="Your Name"
            className="w-full p-2 mb-2 border rounded"
            value={newReview.name}
            onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
          />
          <textarea
            placeholder="Your Comment"
            className="w-full p-2 mb-2 border rounded"
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
          />
          <div className="flex items-center gap-2 mb-4">
            <span>Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-xl ${
                  newReview.rating >= star ? "text-yellow-400" : "text-gray-400"
                }`}
                onClick={() => setNewReview({ ...newReview, rating: star })}
              >
                ★
              </span>
            ))}
          </div>
          <button
            className="bg-[#FF4081] text-white px-4 py-2 rounded hover:bg-pink-500"
            onClick={submitReview}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
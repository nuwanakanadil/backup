"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Typography, Button, TextField } from "@mui/material";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState(""); // what user searched
  const [message, setMessage] = useState("");
  const [sortedProducts, setSortedProducts] = useState([]);
  const [userLocation, setUserLocation] = useState(null); // To store user's location

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
        setSortedProducts(Array.isArray(data) ? data : []); // Initially display all products
      } catch (e) {
        console.error("Failed to load products", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter products after user clicks Search (or presses Enter)
  const filtered = useMemo(() => {
    const q = (submittedTerm || "").trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [sortedProducts, submittedTerm]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setSubmittedTerm(term);
  };

  const handleGoToProduct = (id) => {
    router.push(`/products/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ededed] flex items-center justify-center">
        <p className="text-gray-700">Loading products…</p>
      </div>
    );
  }

  // ✅ FIX: accept the product "item" as a parameter
  const handleAddToCart = async (item) => {
    const email = localStorage.getItem("email");
    const userId = localStorage.getItem("userId");

    if (!email || !userId) {
      alert("Please log in to add items to cart.");
      router.push("/signin");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          userId: userId,
        },
        credentials: "include",
        body: JSON.stringify({
          productId: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Item added to cart successfully!");
      } else {
        alert(data.message || "Failed to add item to cart.");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Something went wrong while adding to cart.");
    }
  };

const handleTestDistance = () => {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      console.log("Your location:", latitude, longitude);

      // Fetch the distances to the canteens from the user's current location
      const res = await fetch("http://localhost:5000/api/calculate-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await res.json();
      console.log("Canteen distances:", data.distances);
      setUserLocation({ latitude, longitude });

      // Sort the products based on the nearest canteen's distance
      const sorted = products.sort((a, b) => {
        const aDistance = data.distances.find(
          (d) => d.canteenId.toString() === a.canteenId?.toString()
        )?.distance || Infinity;  // Set a default value if undefined
        const bDistance = data.distances.find(
          (d) => d.canteenId.toString() === b.canteenId?.toString()
        )?.distance || Infinity;  // Set a default value if undefined

        return aDistance - bDistance;
      });

      setSortedProducts(sorted);
      setMessage(`Distance to nearest canteen: ${data.distances[0]?.distance} km`);
    },
    (err) => {
      console.error("Geolocation error:", err.message);
      setMessage("Failed to get location");
    }
  );
};


  return (
    <div className="min-h-screen bg-[#FFF6E5]">
      {/* Search Bar with Location Tracker Button */}
      <div className="flex justify-between items-center p-6">
        <form
          onSubmit={handleSearch}
          className="flex gap-3 items-center w-full max-w-2xl"
          role="search"
          aria-label="Product search"
        >
          <TextField
            fullWidth
            label="Search products"
            placeholder="Type product name or keywords…"
            value={term}
            color="#FF4081"
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(e);
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              backgroundColor: "#FF4081",
              "&:hover": { backgroundColor: "#e91e63" },
            }}
          >
            Search
          </Button>
        </form>

        {/* Location Button */}
        <div className="ml-4">
          <Button
            variant="contained"
            onClick={handleTestDistance}
            sx={{
              backgroundColor: "#FF4081",
              "&:hover": { backgroundColor: "#e91e63" },
            }}
          >
            Find Nearest Canteen
          </Button>
        </div>
      </div>

      {/* Show distance */}
      <div className="text-center mt-4">
        <Typography variant="body1" color="textSecondary">
          {message}
        </Typography>
      </div>

      {/* Results */}
      <div className="px-6 pb-10">
        {submittedTerm && (
          <p className="text-sm text-gray-600 mb-3 px-1">
            Showing results for: <span className="font-medium">“{submittedTerm}”</span>
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="w-full flex justify-center mt-12">
            <Card className="shadow-lg w-full max-w-xl">
              <CardContent
                className="text-center py-10"
                sx={{ backgroundColor: "#6F4E37", color: "white" }}
              >
                <Typography variant="h6">No products found</Typography>
                <Typography variant="body2" color="text.secondary" className="mt-1">
                  Try a different search term.
                </Typography>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <Card
                key={item._id}
                className="shadow-lg"
                sx={{ backgroundColor: "#6F4E37", color: "white" }}
              >
                <CardContent>
                  <div
                    className="cursor-pointer"
                    onClick={() => handleGoToProduct(item._id)}
                    title="View details"
                  >
                    <img
                      src={`http://localhost:5000/${item.image}`}
                      alt={item.name}
                      className="h-48 w-full object-cover mb-3 rounded"
                    />
                    <Typography variant="h6" className="truncate">
                      {item.name}
                    </Typography>
                    <Typography className="mt-1">${item.price}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="mt-2 line-clamp-2"
                    >
                      {item.description}
                    </Typography>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outlined"
                      onClick={() => handleGoToProduct(item._id)}
                      sx={{
                        color: "#FF4081",
                        borderColor: "#FF4081",
                        "&:hover": {
                          color: "#e91e63",
                          borderColor: "#e91e63",
                          backgroundColor: "transparent",
                        },
                      }}
                    >
                      View
                    </Button>

                    {/* ✅ FIX: pass "item" to the handler */}
                    <Button
                      variant="outlined"
                      sx={{
                        color: "#FF4081",
                        borderColor: "#FF4081",
                        "&:hover": {
                          color: "#e91e63",
                          borderColor: "#e91e63",
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() => handleAddToCart(item)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

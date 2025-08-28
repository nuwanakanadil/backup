
'use client';
import { Card, CardContent, CardMedia, Typography, Button, Grid } from '@mui/material';
import Link from 'next/link';
import Image from "next/image";
import { useEffect,useState } from 'react';

export default function Home() {

  const [products,setProducts] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/products")
    .then((res)=> res.json())
    .then((data)=> setProducts(data))
    .catch((err)=>
    console.error('Failed to fetch products: ',err));
  },[]);

   const [message, setMessage] = useState('');

 const handleTestDistance = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log('Your location:', latitude, longitude);

        const res = await fetch('http://localhost:5000/api/calculate-distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await res.json();
        console.log(`Distance to Canteen A: ${data.distance} km`);
        setMessage(`Distance to Canteen A: ${data.distance} km`);
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        setMessage('Failed to get location');
      }
    );
  };

  return (
    <main className="p-6">
  <Typography variant="h4" gutterBottom>
    Welcome to MealMatrix
  </Typography>

  <Grid container spacing={4}>
    {products.map((item) => (
      <Grid
        item
        xs={12} sm={6} md={4} lg={3} xl={2.4} // ⬅️ ensures 4+ per row on big screens
        key={item._id} // ⬅️ should use MongoDB _id
      >
        <Card className="shadow-lg h-full flex flex-col">
          {/* Image */}
          <CardMedia
            component="img"
            image={`http://localhost:5000/${item.image}`}
            alt={item.name}
            sx={{
              height: 180,
              objectFit: 'cover', // 👈 force consistent crop/fill
            }}
          />

          {/* Content */}
          <CardContent className="flex-grow">
            <Typography variant="h6">{item.name}</Typography>
            <Typography variant="body2" color="textSecondary" paragraph noWrap>
              {item.description}
            </Typography>
            <Typography variant="subtitle1" color="primary">
              Rs. {item.price}
            </Typography>
          </CardContent>

          {/* Button */}
          <CardContent>
            <Link href={`/products/${item._id}`} passHref>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  backgroundColor: '#FF4081',
                  textTransform: 'none',
                  mt: 1
                }}
              >
                Show More
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>

   <div>
      <h1>Location Tracker</h1>
      <Button onClick={handleTestDistance}>Get Current Location</Button>
      <p>{message}</p>
    </div>
</main>
  );
}

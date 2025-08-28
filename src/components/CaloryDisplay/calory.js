'use client';
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Box, Button, Card, Grid, Typography, useMediaQuery, useTheme
} from "@mui/material";

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#8E44AD"];

const COMMON_FOODS = [
  { name: "Donut", calories: 195 },
  { name: "Burger", calories: 295 },
  { name: "Rice", calories: 206 },
  { name: "Pizza", calories: 285 },
  { name: "Soft Drink (Can)", calories: 140 },
  { name: "Banana", calories: 105 },
];

export default function Calory() {
  const searchParams = useSearchParams();
  const food = searchParams.get("food");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isLarge = useMediaQuery(theme.breakpoints.up("lg"));

  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef();

  useEffect(() => {
    if (!food) return;

    const fetchNutrition = async () => {
      try {
        const res = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-app-id": "13c693ae", // Replace with your App ID
            "x-app-key": "249e693587fab0ab4bb34ae8dc729066", // Replace with your API Key
          },
          body: JSON.stringify({ query: food }),
        });

        const data = await res.json();
        setNutrition(data.foods?.[0]);
      } catch (error) {
        console.error("Failed to fetch nutrition info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNutrition();
  }, [food]);

  const chartData = nutrition
    ? [
        { name: "Fat", value: nutrition.nf_total_fat || 0 },
        { name: "Protein", value: nutrition.nf_protein || 0 },
        { name: "Carbs", value: nutrition.nf_total_carbohydrate || 0 },
        {
          name: "Other",
          value: Math.max(
            0,
            (nutrition.serving_weight_grams || 0) -
              (nutrition.nf_total_fat + nutrition.nf_protein + nutrition.nf_total_carbohydrate)
          ),
        },
      ]
    : [];

  const comparisonData = nutrition
    ? [...COMMON_FOODS, { name: nutrition.food_name, calories: nutrition.nf_calories }]
    : COMMON_FOODS;

  const downloadPDF = async () => {
    const element = pdfRef.current;
    const allEls = element.querySelectorAll("*");
    allEls.forEach(el => el.style.color = "#000");

    const canvas = await html2canvas(element, { backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`${nutrition.food_name}_nutrition.pdf`);
  };

  return (
    <Box
      className="min-h-screen"
      sx={{
        backgroundColor: "#fdfdfd",
        px: { xs: 2, sm: 4, md: 8, lg: 14 },
        py: { xs: 4, sm: 6, md: 8 },
      }}
    >
      <Typography
        variant={isMobile ? "h5" : "h4"}
        align="center"
        sx={{ mb: 5, fontWeight: 700, color: "#d81b60" }}
      >
        🍽️ Detected Food: {food}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 8 }}>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
              <Typography variant="h6" className="text-orange-600 font-medium">
                  Loading nutrition information...
              </Typography>
         </Box>
      ) : nutrition ? (
        <Grid container spacing={6} ref={pdfRef}>
          {/* Nutrition Info */}
          <Grid item xs={12} md={5}>
            <Card sx={{ p: { xs: 2, md: 4 }, boxShadow: 3 }}>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{ mb: 3, fontWeight: 700, color: "#880e4f", textTransform: "capitalize" }}
              >
                {nutrition.food_name}
              </Typography>
              <Typography><strong>Calories:</strong> {nutrition.nf_calories} kcal</Typography>
              <Typography><strong>Protein:</strong> {nutrition.nf_protein} g</Typography>
              <Typography><strong>Carbohydrates:</strong> {nutrition.nf_total_carbohydrate} g</Typography>
              <Typography><strong>Total Fat:</strong> {nutrition.nf_total_fat} g</Typography>
              <Typography><strong>Sugar:</strong> {nutrition.nf_sugars} g</Typography>
              <Typography><strong>Fiber:</strong> {nutrition.nf_dietary_fiber} g</Typography>
              <Typography><strong>Sodium:</strong> {nutrition.nf_sodium} mg</Typography>
              <Typography><strong>Cholesterol:</strong> {nutrition.nf_cholesterol} mg</Typography>
              <Typography><strong>Serving Size:</strong> {nutrition.serving_qty} {nutrition.serving_unit} ({nutrition.serving_weight_grams}g)</Typography>

              <Button
                variant="contained"
                color="success"
                onClick={downloadPDF}
                sx={{ mt: 4, width: "100%", fontWeight: 600 }}
              >
                📄 Download Nutrition as PDF
              </Button>
            </Card>
          </Grid>

          {/* Pie Chart */}
          <Grid item xs={12} md={7}>
            <Card sx={{ p: { xs: 2, md: 4 }, boxShadow: 3, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#d81b60", fontWeight: 600 }}>
                Macronutrient Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={isLarge ? 360 : 260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isLarge ? 120 : 90}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          {/* Bar Chart */}
          <Grid item xs={12}>
            <Card sx={{ p: { xs: 2, md: 4 }, boxShadow: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#d81b60", fontWeight: 600 }}>
                Calorie Comparison With Common Foods
              </Typography>
              <ResponsiveContainer width="100%" height={isLarge ? 400 : 280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calories" fill="#FF6384" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        {/* Calorie Energizer */}
        <Grid item xs={12}>
          <Card sx={{ p: { xs: 2, md: 4 }, boxShadow: 3, textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#EF6C00" }}>
              🔥 Calorie Energizer
            </Typography>
            {nutrition && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Total Calories: <strong>{nutrition.nf_calories}</strong> kcal
                </Typography>

                <Box
                  sx={{
                    width: "100%",
                    height: 30,
                    backgroundColor: "#FFE0B2",
                    borderRadius: 20,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      width: `${Math.min((nutrition.nf_calories / 1000) * 100, 100)}%`,
                      height: "100%",
                      backgroundColor: "#FB8C00",
                      borderRadius: 20,
                      transition: "width 0.6s ease-in-out",
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: "block", color: "#616161" }}>
                  Based on 1000 kcal scale
                </Typography>
              </>
            )}
          </Card>
        </Grid>
      </Grid>
      ) : (
        <Typography align="center" color="error" sx={{ mt: 5 }}>
          No nutrition data found for "{food}"
        </Typography>
      )}
    </Box>
  );
}

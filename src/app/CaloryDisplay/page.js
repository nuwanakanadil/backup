'use client'
import Calory from "@/components/CaloryDisplay/calory";

export default function Calorypage({ params }) {
    return <Calory food={params.food} />;
}
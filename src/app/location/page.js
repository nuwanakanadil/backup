'use client';
import getLocation from "@/components/location/getlocation";

export default function LocationPage() {
  return (
    <div>
      <h1>Location Tracker</h1>
      <getLocation />
    </div>
  );
}
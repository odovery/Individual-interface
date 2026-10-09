import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, ShieldCheck, Gauge, MessageCircle, Send,
  X, ChevronLeft, BadgeCheck, FileCheck2, AlertTriangle, Users, Clock,
  LogIn, LogOut, User, Lock, Mail, Navigation, ArrowUpDown, Zap, Battery,
  ImagePlus, Trash2, Sparkles, Eye, EyeOff, ShieldAlert, FileText, Copy,
  ClipboardCheck, Wrench, Umbrella, Calculator, Star, ArrowRight, SlidersHorizontal,
  PoundSterling, Calendar, Fuel, Settings2, ChevronDown, Car, Ruler, Heart,
} from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Chivo:wght@700;900&family=Outfit:wght@400;500;600;700&display=swap');

/* Real CSS instead of Tailwind's responsive utility classes for anything where
   getting the column count right matters — this preview's stylesheet doesn't
   reliably preserve Tailwind's cascade order for responsive variants, which
   silently broke the sidebar width earlier. Media queries here are plain CSS
   and don't depend on that ordering at all. */
.listings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 700px) {
  .listings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 5-year running-cost strip: five compact columns side by side, collapsing
   to a scrollable row on narrow screens rather than stacking vertically. */
.cost-years {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}
@media (max-width: 560px) {
  .cost-years {
    grid-template-columns: repeat(5, minmax(96px, 1fr));
    overflow-x: auto;
  }
}
`;

const palette = {
  paper: "#FFFFFF",
  paperDim: "#F4F1EA",
  ink: "#1A1A1A",
  slate: "#4A4A45",
  slateLight: "#7A7A73",
  verified: "#0F9E8F",
  verifiedBg: "#E3F6F3",
  amber: "#F6D520",
  amberBg: "#FDF6D2",
  // Pale yellow is unreadable as text or a hairline on white, so links,
  // small icons and accent borders use this darker companion instead.
  amberInk: "#8A6D00",
  line: "#DAD6CC",
  lineBold: "#1A1A1A",
  warn: "#B54A62",
  warnBg: "#FBEAEE",
  turquoise: "#5CCFC4",
  turquoiseInk: "#0A3B37",
  pink: "#E89AAC",
  pinkInk: "#4A1523",
  yellowInk: "#1A1A1A",
};

// Chivo Black for display (headings, prices, brand); Outfit for UI and body.
// `serif` is kept as the variable name so the ~200 existing references don't
// all need rewriting — it now points at the display face, not an actual serif.
const serif = { fontFamily: "'Chivo', sans-serif", fontWeight: 900, letterSpacing: "-0.02em" };
const sans = { fontFamily: "'Outfit', sans-serif" };

const MAX_IMAGES = 10;
const PAGE_SIZE = 8; // 2 rows of 4 on desktop

// Single place for the AI text calls (listing descriptions, bill of sale).
// Returns trimmed text, or throws so callers can show their own error state.
async function generateText(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const data = await response.json();
  const text = (data.content || [])
    .map((block) => block.text || "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty response");
  return text;
}

// ---------- Mock data ----------

const INITIAL_LISTINGS = [
  {
    id: 1,
    vehicleType: "Car",
    make: "Volkswagen",
    model: "Golf GT TDI",
    year: 2018,
    price: 11450,
    mileage: 42300,
    location: "Clapham, London",
    lat: 51.4618,
    lng: -0.1424,
    color: "#5CCFC4",
    ownerId: "seller@demo.com",
    spec: {
      bodyType: "Hatchback",
      doors: 5,
      bootSpace: 380,
      gearbox: "Manual",
      colour: "Grey",
      seats: 5,
      isofix: 2,
      fuelType: "Diesel",
      engineSize: 2.0,
      power: 148,
      co2: 119,
      batteryRange: null,
      chargingTime: null,
    },
    financeDeclared: false,
    seller: { name: "Marcus O.", memberSince: 2021, responseTime: "~2 hrs", verified: true, ownerCount: 1 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Mar 2026", result: "Pass", mileage: 42300, notes: "No advisories" },
      { date: "Mar 2025", result: "Pass", mileage: 34120, notes: "Advisory: rear tyre wear" },
      { date: "Mar 2024", result: "Pass", mileage: 25640, notes: "No advisories" },
    ],
    description: "One owner from new, full VW service history, garage-kept. Recent brake discs and pads front and rear.",
  },
  {
    id: 2,
    vehicleType: "Car",
    make: "Toyota",
    model: "Corolla Hybrid Icon",
    year: 2020,
    price: 15990,
    mileage: 28750,
    location: "Islington, London",
    lat: 51.5416,
    lng: -0.1022,
    color: "#E89AAC",
    spec: {
      bodyType: "Hatchback",
      doors: 5,
      bootSpace: 361,
      gearbox: "Automatic",
      colour: "White",
      seats: 5,
      isofix: 2,
      fuelType: "Hybrid",
      engineSize: 1.8,
      power: 122,
      co2: 96,
      batteryRange: null,
      chargingTime: null,
    },
    financeDeclared: false,
    seller: { name: "Priya K.", memberSince: 2023, responseTime: "~30 min", verified: true, ownerCount: 1 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Jul 2026", result: "Pass", mileage: 28750, notes: "No advisories" },
      { date: "Jul 2025", result: "Pass", mileage: 19200, notes: "No advisories" },
    ],
    description: "Immaculate condition, hybrid battery health checked at last service. Selling due to relocation.",
  },
  {
    id: 3,
    vehicleType: "Car",
    make: "Ford",
    model: "Focus ST-Line",
    year: 2017,
    price: 8200,
    mileage: 61200,
    location: "Croydon",
    lat: 51.3762,
    lng: -0.0982,
    color: "#F6D520",
    spec: {
      bodyType: "Hatchback",
      doors: 5,
      bootSpace: 375,
      gearbox: "Manual",
      colour: "Orange",
      seats: 5,
      isofix: 2,
      fuelType: "Petrol",
      engineSize: 1.5,
      power: 150,
      co2: 134,
      batteryRange: null,
      chargingTime: null,
    },
    financeDeclared: false,
    seller: { name: "Dean T.", memberSince: 2020, responseTime: "~5 hrs", verified: false, ownerCount: 3 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: false },
    motHistory: [
      { date: "Jan 2026", result: "Pass", mileage: 61200, notes: "Advisory: minor oil leak" },
      { date: "Jan 2025", result: "Fail then Pass", mileage: 52800, notes: "Failed on rear light, fixed same day" },
    ],
    description: "Good runner, few cosmetic marks on the bumper. Was in a minor rear-end shunt in 2022, repaired professionally — happy to share the invoice.",
  },
  {
    id: 4,
    vehicleType: "Car",
    make: "BMW",
    model: "3 Series 320d M Sport",
    year: 2019,
    price: 17500,
    mileage: 38900,
    location: "Richmond, London",
    lat: 51.4613,
    lng: -0.3037,
    color: "#5CCFC4",
    spec: {
      bodyType: "Saloon",
      doors: 4,
      bootSpace: 480,
      gearbox: "Automatic",
      colour: "Black",
      seats: 5,
      isofix: 2,
      fuelType: "Diesel",
      engineSize: 2.0,
      power: 190,
      co2: 123,
      batteryRange: null,
      chargingTime: null,
    },
    financeDeclared: false,
    seller: { name: "Alex F.", memberSince: 2022, responseTime: "~1 hr", verified: true, ownerCount: 2 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Sep 2026", result: "Pass", mileage: 38900, notes: "No advisories" },
      { date: "Sep 2025", result: "Pass", mileage: 29100, notes: "Advisory: front discs wearing thin" },
    ],
    description: "M Sport pack, full leather, recently replaced front discs and pads. BMW main dealer history.",
  },
  {
    id: 5,
    vehicleType: "Car",
    make: "Nissan",
    model: "Leaf Acenta",
    year: 2021,
    price: 14500,
    mileage: 21000,
    location: "Hackney, London",
    lat: 51.5450,
    lng: -0.0553,
    color: "#E89AAC",
    financeDeclared: false,
    seller: { name: "Sofia R.", memberSince: 2023, responseTime: "~1 hr", verified: true, ownerCount: 1 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Apr 2026", result: "Pass", mileage: 21000, notes: "No advisories" },
      { date: "Apr 2025", result: "Pass", mileage: 13400, notes: "No advisories" },
    ],
    description: "Fully electric, low running costs, home charger cable included. Battery health report available on request.",
    spec: {
      bodyType: "Hatchback",
      doors: 5,
      bootSpace: 435,
      gearbox: "Automatic",
      colour: "Blue",
      seats: 5,
      isofix: 2,
      fuelType: "Electric",
      engineSize: null,
      power: 148,
      co2: 0,
      batteryRange: 168,
      chargingTime: 7.5,
    },
  },
  {
    id: 6,
    vehicleType: "Motorcycle",
    make: "Kawasaki",
    model: "Z650",
    year: 2021,
    price: 5200,
    mileage: 8900,
    location: "Peckham, London",
    lat: 51.4700,
    lng: -0.0700,
    color: "#F6D520",
    financeDeclared: false,
    seller: { name: "Chris B.", memberSince: 2022, responseTime: "~3 hrs", verified: true, ownerCount: 1 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Jun 2026", result: "Pass", mileage: 8900, notes: "No advisories" },
      { date: "Jun 2025", result: "Pass", mileage: 5200, notes: "No advisories" },
    ],
    description: "Well maintained naked bike, chain and sprockets replaced recently, full service history. Great first big bike or A2-licence upgrade.",
    spec: {
      bodyType: "Naked",
      doors: null,
      bootSpace: null,
      gearbox: "Manual",
      colour: "Green",
      seats: 2,
      isofix: null,
      fuelType: "Petrol",
      engineSize: 649,
      power: 67,
      co2: 98,
      batteryRange: null,
      chargingTime: null,
      licenseCategory: "A2",
      loadVolume: null,
      payload: null,
    },
  },
  {
    id: 7,
    vehicleType: "Van",
    make: "Ford",
    model: "Transit Custom",
    year: 2020,
    price: 15800,
    mileage: 58000,
    location: "Dagenham, London",
    lat: 51.5540,
    lng: 0.1600,
    color: "#5CCFC4",
    financeDeclared: false,
    seller: { name: "Kevin M.", memberSince: 2020, responseTime: "~4 hrs", verified: true, ownerCount: 2 },
    trust: { motVerified: true, mileageVerified: true, hpiClear: true, accidentFree: true },
    motHistory: [
      { date: "Feb 2026", result: "Pass", mileage: 58000, notes: "Advisory: nearside rear tyre wearing" },
      { date: "Feb 2025", result: "Pass", mileage: 45200, notes: "No advisories" },
    ],
    description: "Ex-fleet van, dealer serviced throughout, ply-lined load area, tow bar fitted. Ready for work.",
    spec: {
      bodyType: "Panel van",
      doors: 4,
      bootSpace: null,
      gearbox: "Manual",
      colour: "White",
      seats: 3,
      isofix: null,
      fuelType: "Diesel",
      engineSize: 2.0,
      power: 130,
      co2: 189,
      batteryRange: null,
      chargingTime: null,
      licenseCategory: null,
      loadVolume: 6.0,
      payload: 1000,
    },
  },
];

// ---------- Location & sorting helpers ----------

// Haversine distance in miles between two lat/lng points.
function distanceMiles(lat1, lng1, lat2, lng2) {  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---------- Running cost estimates ----------
// VED and MOT figures are based on published 2026/27 UK rates (DVLA, DVSA).
// Maintenance is modelled as a generalised service schedule (typical
// manufacturer-style intervals by fuel type — not a real per-manufacturer
// guide, which isn't something we have API access to). Costs are only
// triggered in a given year when the car's projected mileage or age actually
// crosses that item's interval, so the estimate genuinely varies by both
// year and mileage rather than applying a flat annual figure.

const AVG_MILES_PER_YEAR_FALLBACK = 8000;
const MIN_PLAUSIBLE_ANNUAL_MILES = 4000;
const MAX_PLAUSIBLE_ANNUAL_MILES = 20000;

function estimateVED(listing) {
  if (listing.vehicleType === "Motorcycle") {
    const cc = listing.spec?.engineSize ?? 400;
    let amount;
    if (cc <= 150) amount = 20;
    else if (cc <= 400) amount = 44;
    else if (cc <= 600) amount = 67;
    else amount = 93;
    return { amount, note: `Motorcycle rate for ${cc}cc (2026/27 DVLA band).` };
  }
  if (listing.vehicleType === "Van") {
    return { amount: 360, note: "Standard light goods vehicle rate (2026/27)." };
  }
  // Car
  const year = listing.year;
  if (year >= 2017) {
    return { amount: 200, note: "Standard rate for cars registered after April 2017 (2026/27 rate)." };
  }
  const co2 = listing.spec?.co2 ?? 150;
  let amount;
  if (co2 <= 100) amount = 20;
  else if (co2 <= 120) amount = 35;
  else if (co2 <= 130) amount = 160;
  else if (co2 <= 150) amount = 200;
  else if (co2 <= 170) amount = 240;
  else if (co2 <= 190) amount = 275;
  else if (co2 <= 225) amount = 475;
  else if (co2 <= 255) amount = 490;
  else amount = 790;
  return { amount, note: "Approximate CO2-banded rate for cars registered before April 2017." };
}

function motCostForAge(age, vehicleType) {
  if (age < 3) return 0; // first MOT due at 3 years old for cars, vans and motorcycles alike
  return vehicleType === "Motorcycle" ? 30 : 45; // typical price; DVSA caps are £29.65 (bikes) / £54.85 (cars & most vans)
}

// Generalised service schedules by vehicle type (and fuel type, where relevant).
// Each item fires whenever projected mileage or age crosses a multiple of its
// interval — e.g. a "24,000 mile" item triggers whichever year cumulative
// mileage passes 24k, 48k, 72k, etc.
function buildServiceSchedule(vehicleType, fuelType) {
  if (vehicleType === "Motorcycle") {
    return [
      { name: "Basic service (oil, chain, brakes check)", intervalMiles: 4000, intervalMonths: 12, cost: 110 },
      { name: "Major service (valve clearances)", intervalMiles: 12000, intervalMonths: 24, cost: 280 },
      { name: "Chain & sprockets", intervalMiles: 15000, intervalMonths: null, cost: 150 },
      { name: "Tyres (front & rear)", intervalMiles: 10000, intervalMonths: null, cost: 220 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 60 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 48, cost: 90 },
    ];
  }
  if (vehicleType === "Van") {
    return [
      { name: "Interim service (oil & filters)", intervalMiles: 10000, intervalMonths: 12, cost: 190 },
      { name: "Full service", intervalMiles: 20000, intervalMonths: 24, cost: 320 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 90 },
      { name: "Brake pads & discs", intervalMiles: 30000, intervalMonths: null, cost: 260 }, // heavier loads wear brakes faster
      { name: "Timing belt/chain", intervalMiles: 70000, intervalMonths: 72, cost: 600 },
      { name: "DPF service", intervalMiles: 80000, intervalMonths: null, cost: 380 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 48, cost: 150 },
    ];
  }

  // Car — by fuel type
  const schedules = {
    Petrol: [
      { name: "Interim service (oil & filters)", intervalMiles: 12000, intervalMonths: 12, cost: 150 },
      { name: "Full service", intervalMiles: 24000, intervalMonths: 24, cost: 260 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 80 },
      { name: "Brake pads & discs", intervalMiles: 35000, intervalMonths: null, cost: 220 },
      { name: "Timing belt/chain", intervalMiles: 80000, intervalMonths: 84, cost: 450 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 60, cost: 130 },
    ],
    Diesel: [
      { name: "Interim service (oil & filters)", intervalMiles: 12000, intervalMonths: 12, cost: 180 },
      { name: "Full service", intervalMiles: 20000, intervalMonths: 24, cost: 300 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 85 },
      { name: "Brake pads & discs", intervalMiles: 35000, intervalMonths: null, cost: 230 },
      { name: "Timing belt/chain", intervalMiles: 70000, intervalMonths: 72, cost: 550 },
      { name: "DPF service", intervalMiles: 80000, intervalMonths: null, cost: 350 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 60, cost: 140 },
    ],
    Hybrid: [
      { name: "Interim service", intervalMiles: 12000, intervalMonths: 12, cost: 130 },
      { name: "Full service", intervalMiles: 24000, intervalMonths: 24, cost: 220 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 80 },
      { name: "Brake pads & discs", intervalMiles: 45000, intervalMonths: null, cost: 180 }, // regen braking = less wear
      { name: "Hybrid battery health check", intervalMiles: null, intervalMonths: 24, cost: 60 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 60, cost: 130 },
    ],
    Electric: [
      { name: "Annual health check", intervalMiles: null, intervalMonths: 12, cost: 100 },
      { name: "Brake fluid change", intervalMiles: 24000, intervalMonths: 24, cost: 80 },
      { name: "Brake pads & discs", intervalMiles: 60000, intervalMonths: null, cost: 150 }, // regen braking = much less wear
      { name: "Tyres (higher torque wear)", intervalMiles: 20000, intervalMonths: null, cost: 220 },
      { name: "12V battery", intervalMiles: null, intervalMonths: 60, cost: 120 },
    ],
  };
  return schedules[fuelType] || schedules.Petrol;
}

// Projects VED, MOT and maintenance year-by-year for `years` ahead, using this
// specific vehicle's own mileage/age ratio (not a generic assumption) wherever
// there's enough history to derive one.
function projectRunningCosts(listing, years = 5) {
  const currentYear = new Date().getFullYear();
  const ageNow = Math.max(0, currentYear - listing.year);
  const mileageNow = listing.mileage || 0;

  const rawAnnualMiles = ageNow > 0 ? mileageNow / ageNow : AVG_MILES_PER_YEAR_FALLBACK;
  const milesPerYear = Math.round(
    Math.min(MAX_PLAUSIBLE_ANNUAL_MILES, Math.max(MIN_PLAUSIBLE_ANNUAL_MILES, rawAnnualMiles))
  );

  const ved = estimateVED(listing);
  const schedule = buildServiceSchedule(listing.vehicleType, listing.spec?.fuelType);

  let cumMiles = mileageNow;
  let cumMonths = ageNow * 12;
  const yearRows = [];

  for (let i = 1; i <= years; i++) {
    const startMiles = cumMiles;
    const startMonths = cumMonths;
    cumMiles += milesPerYear;
    cumMonths += 12;

    const dueItems = schedule.filter((item) => {
      const dueByMiles = item.intervalMiles
        ? Math.floor(cumMiles / item.intervalMiles) > Math.floor(startMiles / item.intervalMiles)
        : false;
      const dueByMonths = item.intervalMonths
        ? Math.floor(cumMonths / item.intervalMonths) > Math.floor(startMonths / item.intervalMonths)
        : false;
      return dueByMiles || dueByMonths;
    });

    const maintenance = dueItems.reduce((sum, item) => sum + item.cost, 0);
    const mot = motCostForAge(ageNow + i, listing.vehicleType);

    yearRows.push({
      year: currentYear + i,
      mileageAtYearEnd: cumMiles,
      maintenance,
      maintenanceItems: dueItems.map((item) => item.name),
      mot,
      ved: ved.amount,
      total: maintenance + mot + ved.amount,
    });
  }

  const fiveYearTotal = yearRows.reduce((sum, y) => sum + y.total, 0);

  return { milesPerYear, ved, years: yearRows, fiveYearTotal };
}

// Sort field definitions: how to extract a comparable value from a listing.
// Fields with `null` values (e.g. battery range on a petrol car) always sort to the end.
// Category-specific range filter: one representative "size" attribute per
// vehicle type, bucketed into checkable ranges rather than a raw number input.
const RANGE_FILTERS = {
  Car: {
    label: "Boot space",
    getValue: (l) => l.spec.bootSpace,
    buckets: [
      { id: "lt300", label: "Up to 300L", test: (v) => v != null && v < 300 },
      { id: "300-400", label: "300–400L", test: (v) => v != null && v >= 300 && v < 400 },
      { id: "400-500", label: "400–500L", test: (v) => v != null && v >= 400 && v < 500 },
      { id: "500+", label: "500L+", test: (v) => v != null && v >= 500 },
    ],
  },
  Motorcycle: {
    label: "Engine size",
    getValue: (l) => l.spec.engineSize,
    buckets: [
      { id: "lt125", label: "Up to 125cc", test: (v) => v != null && v <= 125 },
      { id: "126-400", label: "126–400cc", test: (v) => v != null && v > 125 && v <= 400 },
      { id: "401-600", label: "401–600cc", test: (v) => v != null && v > 400 && v <= 600 },
      { id: "600+", label: "600cc+", test: (v) => v != null && v > 600 },
    ],
  },
  Van: {
    label: "Load volume",
    getValue: (l) => l.spec.loadVolume,
    buckets: [
      { id: "lt5", label: "Up to 5m³", test: (v) => v != null && v < 5 },
      { id: "5-8", label: "5–8m³", test: (v) => v != null && v >= 5 && v < 8 },
      { id: "8-10", label: "8–10m³", test: (v) => v != null && v >= 8 && v < 10 },
      { id: "10+", label: "10m³+", test: (v) => v != null && v >= 10 },
    ],
  },
};

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

// Local fallback coordinates. The postcodes.io lookup is the primary path, but
// sandboxed preview environments often block outbound requests, which would
// otherwise leave distance filtering permanently unusable. These cover the
// common cases so the feature still works offline.
const LOCAL_PLACES = {
  LONDON: { lat: 51.5072, lng: -0.1276 },
  MANCHESTER: { lat: 53.4808, lng: -2.2426 },
  BIRMINGHAM: { lat: 52.4862, lng: -1.8904 },
  LEEDS: { lat: 53.8008, lng: -1.5491 },
  GLASGOW: { lat: 55.8642, lng: -4.2518 },
  LIVERPOOL: { lat: 53.4084, lng: -2.9916 },
  BRISTOL: { lat: 51.4545, lng: -2.5879 },
  EDINBURGH: { lat: 55.9533, lng: -3.1883 },
  SHEFFIELD: { lat: 53.3811, lng: -1.4701 },
  CARDIFF: { lat: 51.4816, lng: -3.1791 },
  NOTTINGHAM: { lat: 52.9548, lng: -1.1581 },
  NEWCASTLE: { lat: 54.9783, lng: -1.6178 },
  BRIGHTON: { lat: 50.8225, lng: -0.1372 },
  OXFORD: { lat: 51.7520, lng: -1.2577 },
  CAMBRIDGE: { lat: 52.2053, lng: 0.1218 },
  YORK: { lat: 53.9600, lng: -1.0873 },
  BATH: { lat: 51.3811, lng: -2.3590 },
  READING: { lat: 51.4543, lng: -0.9781 },
  CROYDON: { lat: 51.3762, lng: -0.0982 },
  RICHMOND: { lat: 51.4613, lng: -0.3037 },
};

// Approximate centres for common London/major-city outward codes.
const LOCAL_OUTCODES = {
  W3: { lat: 51.5075, lng: -0.2700 },
  W1: { lat: 51.5142, lng: -0.1494 },
  SW1: { lat: 51.4975, lng: -0.1357 },
  SW1A: { lat: 51.5010, lng: -0.1416 },
  SW4: { lat: 51.4618, lng: -0.1424 },
  SE1: { lat: 51.5045, lng: -0.0865 },
  N1: { lat: 51.5416, lng: -0.1022 },
  E1: { lat: 51.5150, lng: -0.0720 },
  E8: { lat: 51.5450, lng: -0.0553 },
  EC1: { lat: 51.5230, lng: -0.1000 },
  NW1: { lat: 51.5350, lng: -0.1430 },
  CR0: { lat: 51.3762, lng: -0.0982 },
  TW9: { lat: 51.4613, lng: -0.3037 },
  RM9: { lat: 51.5540, lng: 0.1600 },
  M1: { lat: 53.4808, lng: -2.2426 },
  B1: { lat: 52.4862, lng: -1.8904 },
  LS1: { lat: 53.8008, lng: -1.5491 },
};

const YEAR_BUCKETS = [
  { id: "2023+", label: "2023 or newer", test: (year) => year >= 2023 },
  { id: "2020-2022", label: "2020–2022", test: (year) => year >= 2020 && year <= 2022 },
  { id: "2016-2019", label: "2016–2019", test: (year) => year >= 2016 && year <= 2019 },
  { id: "pre2016", label: "Before 2016", test: (year) => year < 2016 },
];

const MILEAGE_BUCKETS = [
  { id: "lt10k", label: "Up to 10,000 mi", test: (mi) => mi <= 10000 },
  { id: "10-30k", label: "10,000–30,000 mi", test: (mi) => mi > 10000 && mi <= 30000 },
  { id: "30-60k", label: "30,000–60,000 mi", test: (mi) => mi > 30000 && mi <= 60000 },
  { id: "60k+", label: "60,000+ mi", test: (mi) => mi > 60000 },
];

const SORT_FIELDS = [
  { key: "distance", label: "Distance", needsLocation: true, get: (l, dist) => dist[l.id] },
  { key: "price", label: "Price", get: (l) => l.price },
  { key: "make", label: "Make (A–Z)", get: (l) => l.make, type: "string" },
  { key: "model", label: "Model (A–Z)", get: (l) => l.model, type: "string" },
  { key: "year", label: "Year", get: (l) => l.year },
  { key: "bodyType", label: "Body type", get: (l) => l.spec.bodyType, type: "string" },
  { key: "mileage", label: "Mileage", get: (l) => l.mileage },
  { key: "doors", label: "Doors", get: (l) => l.spec.doors },
  { key: "bootSpace", label: "Boot space", get: (l) => l.spec.bootSpace },
  { key: "gearbox", label: "Gearbox", get: (l) => l.spec.gearbox, type: "string" },
  { key: "colour", label: "Colour", get: (l) => l.spec.colour, type: "string" },
  { key: "seats", label: "Seats", get: (l) => l.spec.seats },
  { key: "isofix", label: "Isofix points", get: (l) => l.spec.isofix },
  { key: "fuelType", label: "Fuel type", get: (l) => l.spec.fuelType, type: "string" },
  { key: "batteryRange", label: "Battery range", get: (l) => l.spec.batteryRange },
  { key: "chargingTime", label: "Charging time", get: (l) => l.spec.chargingTime },
  { key: "engineSize", label: "Engine size", get: (l) => l.spec.engineSize },
  { key: "power", label: "Power (bhp)", get: (l) => l.spec.power },
  { key: "co2", label: "CO2 emissions", get: (l) => l.spec.co2 },
  { key: "loadVolume", label: "Load volume (vans)", get: (l) => l.spec.loadVolume },
  { key: "payload", label: "Payload (vans)", get: (l) => l.spec.payload },
];

// Shape shared by every thread — kept in one place so new fields (like `offer`)
// can't silently go missing from one of the several places a thread gets created.
function emptyThread() {
  return { dealStatus: "none", addOns: [], offer: null, messages: [] };
}

const INITIAL_THREADS = {
  1: {
    ...emptyThread(),
    messages: [
      { from: "them", text: "Hi! Yes it's still available. Happy to answer any questions.", time: "10:02" },
      { from: "me", text: "Would you consider an independent inspection before we agree a price?", time: "10:05" },
      { from: "them", text: "Of course — I'd actually prefer that, gives us both peace of mind.", time: "10:11" },
    ],
  },
};

// Placeholder social proof for the prototype. Replace with real, attributable
// reviews and genuine partner agreements before this goes anywhere public —
// invented testimonials and unearned partner logos are misleading (and in the
// UK, fake reviews are prohibited under the DMCC Act 2024).
const REVIEWS = [
  { name: "Hannah W.", location: "Bristol", rating: 5, text: "The MOT history was right there on the listing. I could see the mileage matched every year — didn't have to take anyone's word for it." },
  { name: "Tom A.", location: "Leeds", rating: 5, text: "Sold my Focus in nine days. The finance disclosure question up front saved an awkward conversation later." },
  { name: "Priya S.", location: "London", rating: 4, text: "Payment protection made it feel safe buying from a stranger. Would've walked away from a cash-in-a-car-park deal." },
];

const PARTNERS = [
  { name: "DVSA", role: "MOT history data" },
  { name: "DVLA", role: "Vehicle registration records" },
  { name: "HPI", role: "Finance & write-off checks" },
  { name: "The AA", role: "Inspections & warranty" },
];

const MISSION_POINTS = [
  { icon: FileCheck2, title: "Verified before it's listed", text: "Every car is checked against official MOT and registration records, so buyers see facts — not just the seller's description." },
  { icon: ShieldCheck, title: "Protected payments", text: "Funds are held securely and only released once the buyer has the car and confirms it matches the listing." },
  { icon: Users, title: "No dealers, no middlemen", text: "Private buyers and sellers deal directly, so sellers keep more and buyers pay less than forecourt prices." },
];

const DEMO_USERS = [
  { email: "buyer@demo.com", password: "password123", name: "Jamie", role: "buyer" },
  { email: "seller@demo.com", password: "password123", name: "Marcus", role: "seller" },
];

// ---------- Small components ----------

function LoginModal({ onClose, onLogin, users, onSignup, initialMode = "login", contextMessage = "" }) {
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleLoginSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!match) {
      setError("Incorrect email or password. Try buyer@demo.com / password123.");
      return;
    }
    setError("");
    onLogin(match);
  }

  function handleSignupSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Fill in your name, email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }
    const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      setError("An account with that email already exists — log in instead.");
      return;
    }
    setError("");
    onSignup({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,36,48,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-sm p-6 relative"
        style={{ background: palette.paper, border: `1px solid ${palette.line}` }}
      >
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: palette.slate }}>
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} style={{ color: palette.ink }} />
          <span style={{ ...serif, fontSize: 18, color: palette.ink }}>Odo Veritas</span>
        </div>
        {contextMessage && (
          <p style={{ ...sans, fontSize: 12.5, color: palette.ink, background: palette.amberBg, padding: "8px 10px", borderRadius: 2, marginTop: 10 }}>
            {contextMessage}
          </p>
        )}
        <h2 style={{ ...serif, fontSize: 22, color: palette.ink, marginTop: 8 }}>
          {mode === "login" ? "Log in" : "Create your account"}
        </h2>
        <p style={{ ...sans, fontSize: 12.5, color: palette.slateLight, marginTop: 4, marginBottom: 16 }}>
          {mode === "login"
            ? "Demo credentials: buyer@demo.com / password123"
            : "Just needs an email and password — takes a few seconds."}
        </p>

        <form onSubmit={mode === "login" ? handleLoginSubmit : handleSignupSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
              <User size={15} style={{ color: palette.slateLight }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 outline-none"
                style={{ ...sans, fontSize: 13.5, background: "transparent" }}
              />
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
            <Mail size={15} style={{ color: palette.slateLight }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 outline-none"
              style={{ ...sans, fontSize: 13.5, background: "transparent" }}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
            <Lock size={15} style={{ color: palette.slateLight }} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 outline-none"
              style={{ ...sans, fontSize: 13.5, background: "transparent" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{ color: palette.slateLight, display: "flex" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <p style={{ ...sans, fontSize: 12.5, color: "#B4432E" }}>{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-sm mt-2"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p style={{ ...sans, fontSize: 12.5, color: palette.slate, marginTop: 14, textAlign: "center" }}>
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} style={{ color: palette.amberInk, fontWeight: 500 }}>
                Create one
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }} style={{ color: palette.amberInk, fontWeight: 500 }}>
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options, selected, onToggle, vertical = false }) {
  if (options.length === 0) return null;
  return (
    <div>
      {label && <p style={{ ...sans, fontSize: 12, fontWeight: 600, color: palette.ink, marginBottom: 6 }}>{label}</p>}
      <div className={vertical ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          if (vertical) {
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
                style={{ ...sans, fontSize: 13, color: palette.ink }}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(opt.value)} />
                {opt.label}
              </label>
            );
          }
          return (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm cursor-pointer"
              style={{ border: `${checked ? 2 : 1}px solid ${checked ? palette.lineBold : palette.line}`, background: checked ? palette.amberBg : "#fff" }}
            >
              <input type="checkbox" checked={checked} onChange={() => onToggle(opt.value)} />
              <span style={{ ...sans, fontSize: 12, color: palette.ink }}>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FilterSection({ icon: Icon, label, sectionKey, openSections, onToggle, children }) {
  const isOpen = !!openSections[sectionKey];
  return (
    <div style={{ borderBottom: `1px solid #CDEDE9` }}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between py-3"
        style={{ ...sans, fontSize: 14, fontWeight: 600, color: palette.ink }}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={17} style={{ color: palette.verified }} />
          {label}
        </span>
        <ChevronDown size={16} style={{ color: palette.slate, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

function TrustBadge({ ok, label, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs"
      style={{
        background: ok ? palette.verifiedBg : palette.warnBg,
        color: ok ? palette.verified : palette.warn,
        ...sans,
        fontWeight: 500,
      }}
    >
      <Icon size={13} />
      {label}
    </div>
  );
}

function SpecRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between" style={{ ...sans, fontSize: 13 }}>
      <span className="flex items-center gap-1.5" style={{ color: palette.slate }}>
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <span style={{ color: palette.ink, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function RunningCostsPanel({ listing }) {
  const projection = useMemo(() => projectRunningCosts(listing, 5), [listing]);
  const [expandedYear, setExpandedYear] = useState(null);

  const detail = expandedYear != null ? projection.years[expandedYear] : null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={16} style={{ color: palette.ink }} />
        <h3 style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.ink }}>Estimated running costs — next 5 years</h3>
      </div>
      <div className="rounded-sm p-4" style={{ border: `1px solid ${palette.line}` }}>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <span style={{ ...sans, fontSize: 13, color: palette.slate }}>
            5-year total <strong style={{ color: palette.ink }}>£{projection.fiveYearTotal.toLocaleString()}</strong>
            {" "}(~£{Math.round(projection.fiveYearTotal / 5).toLocaleString()}/yr)
          </span>
          <span style={{ ...sans, fontSize: 11.5, color: palette.slateLight }}>
            Based on ~{projection.milesPerYear.toLocaleString()} miles/year
          </span>
        </div>

        <div className="cost-years">
          {projection.years.map((y, i) => {
            const isOpen = expandedYear === i;
            return (
              <button
                key={y.year}
                onClick={() => setExpandedYear(isOpen ? null : i)}
                className="p-2.5 rounded-sm text-center"
                style={{
                  background: isOpen ? palette.amberBg : i === 0 ? palette.verifiedBg : palette.paperDim,
                  border: `1px solid ${isOpen ? palette.amber : i === 0 ? `${palette.verified}33` : palette.line}`,
                }}
              >
                <p style={{ ...sans, fontSize: 10.5, color: palette.slate }}>{y.year}</p>
                <p style={{ ...sans, fontSize: 15, fontWeight: 700, color: palette.ink, marginTop: 2 }}>£{y.total.toLocaleString()}</p>
                {y.maintenanceItems.length > 0 && (
                  <p style={{ ...sans, fontSize: 9.5, color: palette.slateLight, marginTop: 3 }}>
                    {y.maintenanceItems.length} item{y.maintenanceItems.length > 1 ? "s" : ""} due
                  </p>
                )}
                <ChevronDown
                  size={12}
                  style={{ color: palette.slate, margin: "3px auto 0", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                />
              </button>
            );
          })}
        </div>

        {detail && (
          <div className="mt-3 p-3 rounded-sm" style={{ background: palette.amberBg, border: `1px solid ${palette.amber}33` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: palette.ink }}>
                {detail.year} — {detail.mileageAtYearEnd.toLocaleString()} miles total
              </span>
              <span style={{ ...sans, fontSize: 13.5, fontWeight: 700, color: palette.ink }}>£{detail.total.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" style={{ ...sans, fontSize: 11.5, color: palette.slate }}>
              <span>Road tax £{detail.ved}</span>
              <span>MOT £{detail.mot}</span>
              <span>Maintenance £{detail.maintenance}</span>
            </div>
            {detail.maintenanceItems.length > 0 ? (
              <p style={{ ...sans, fontSize: 11.5, color: palette.slate, marginTop: 6 }}>
                <strong>Due this year:</strong> {detail.maintenanceItems.join(", ")}
              </p>
            ) : (
              <p style={{ ...sans, fontSize: 11.5, color: palette.slate, marginTop: 6 }}>
                No scheduled service items fall due this year.
              </p>
            )}
          </div>
        )}

        <p style={{ ...sans, fontSize: 10.5, color: palette.slateLight, marginTop: 12 }}>
          Tap a year for the breakdown. Illustrative estimate: VED and MOT use published 2026/27 rates; maintenance follows a generalised {listing.vehicleType === "Car" ? `${listing.spec.fuelType.toLowerCase()}-vehicle` : listing.vehicleType.toLowerCase()} service schedule (typical intervals for this type), not this specific manufacturer's actual guide. Excludes fuel/electricity, insurance, and any pre-existing wear this vehicle may already have.
        </p>
      </div>
    </div>
  );
}

// Inline SVG vehicle art, used when a listing has no uploaded photos.
// Drawn rather than fetched: remote images can't be relied on here, and a
// broken-image icon looks worse than an illustration that always renders.
function VehicleArt({ type, accent, seed = 0 }) {
  const shade = "#1A1A1A";
  const glass = "rgba(255,255,255,0.55)";
  // Small variations so a grid of placeholders doesn't look copy-pasted.
  const variants = [
    { wheelR: 15, roof: 0 },
    { wheelR: 16, roof: -3 },
    { wheelR: 14, roof: 3 },
  ];
  const v = variants[seed % variants.length];

  if (type === "Motorcycle") {
    return (
      <svg viewBox="0 0 240 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Motorcycle illustration">
        <circle cx="52" cy="86" r="24" fill="none" stroke={shade} strokeWidth="6" />
        <circle cx="188" cy="86" r="24" fill="none" stroke={shade} strokeWidth="6" />
        <path d="M52 86 L96 56 L146 56 L188 86" fill="none" stroke={shade} strokeWidth="5" strokeLinecap="round" />
        <path d="M96 56 L112 86 L188 86" fill="none" stroke={shade} strokeWidth="5" strokeLinecap="round" />
        <path d="M92 54 q28 -22 62 -6 l-10 18 q-26 -10 -46 4 z" fill={accent} stroke={shade} strokeWidth="4" strokeLinejoin="round" />
        <path d="M150 48 q16 -6 26 2" fill="none" stroke={shade} strokeWidth="5" strokeLinecap="round" />
        <rect x="104" y="40" width="42" height="12" rx="6" fill={shade} />
      </svg>
    );
  }

  if (type === "Van") {
    return (
      <svg viewBox="0 0 240 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Van illustration">
        <path d="M24 88 L24 40 q0 -6 6 -6 L128 34 q10 0 16 8 l34 40 L216 82 q8 0 8 8 l0 -2 z" fill={accent} stroke={shade} strokeWidth="5" strokeLinejoin="round" />
        <path d="M132 42 q7 0 11 6 l22 26 L132 74 z" fill={glass} stroke={shade} strokeWidth="4" strokeLinejoin="round" />
        <rect x="40" y="44" width="76" height="30" rx="3" fill={glass} stroke={shade} strokeWidth="4" />
        <path d="M24 88 L224 88" stroke={shade} strokeWidth="5" strokeLinecap="round" />
        <circle cx="72" cy="90" r={v.wheelR + 4} fill="#fff" stroke={shade} strokeWidth="6" />
        <circle cx="180" cy="90" r={v.wheelR + 4} fill="#fff" stroke={shade} strokeWidth="6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Car illustration">
      <path
        d={`M20 86 L26 62 q2 -8 12 -9 L74 ${49 + v.roof} q10 -9 26 -9 L148 ${40 + v.roof} q14 0 22 9 l20 14 q18 3 22 10 l2 22 z`}
        fill={accent}
        stroke={shade}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d={`M80 ${52 + v.roof} q8 -7 20 -7 L142 ${44 + v.roof} q10 0 16 7 l12 12 L76 64 z`} fill={glass} stroke={shade} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M120 ${45 + v.roof} L120 66`} stroke={shade} strokeWidth="4" />
      <path d="M20 86 L224 86" stroke={shade} strokeWidth="5" strokeLinecap="round" />
      <circle cx="68" cy="88" r={v.wheelR + 5} fill="#fff" stroke={shade} strokeWidth="6" />
      <circle cx="178" cy="88" r={v.wheelR + 5} fill="#fff" stroke={shade} strokeWidth="6" />
    </svg>
  );
}

function SpecPill({ children }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full"
      style={{ ...sans, fontSize: 12, color: palette.turquoiseInk, background: "#E8F7F5" }}
    >
      {children}
    </span>
  );
}

function ListingCard({ listing, onOpen, distance, saved, onToggleSave, compared, onToggleCompare, compareDisabled = false }) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: "#fff", border: `2px solid ${palette.turquoise}` }}
    >
      <div className="relative">
        <button onClick={() => onOpen(listing)} className="text-left w-full block">
          <div className="h-56 w-full flex items-center justify-center overflow-hidden" style={{ background: listing.color }}>
            {listing.images?.length > 0 ? (
              <img src={listing.images[0]} alt={`${listing.make} ${listing.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center px-6">
                <VehicleArt type={listing.vehicleType} accent="#FFFFFF" seed={listing.id} />
              </div>
            )}
          </div>
          {!listing.trust.motVerified && (
            <span
              className="absolute left-3 bottom-3 px-2.5 py-1 rounded-sm"
              style={{ ...sans, fontSize: 11.5, fontWeight: 500, background: "rgba(247,245,241,0.95)", color: palette.warn }}
            >
              Verification pending
            </span>
          )}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id); }}
          className="absolute top-3 right-3 flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: "9999px", background: "#fff", boxShadow: "0 1px 4px rgba(27,36,48,0.25)" }}
          aria-label={saved ? "Remove from saved" : "Save listing"}
        >
          <Heart size={16} style={{ color: palette.lineBold }} fill={saved ? palette.amber : "none"} />
        </button>
      </div>

      <div className="p-4 cursor-pointer" onClick={() => onOpen(listing)}>
        <h3 style={{ ...sans, fontSize: 17, fontWeight: 700, color: palette.ink }}>{listing.make} {listing.model}</h3>
        <p style={{ ...sans, fontSize: 13, color: palette.slate, marginTop: 2 }}>{listing.spec.bodyType}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <SpecPill>{listing.year}</SpecPill>
          <SpecPill>{listing.mileage.toLocaleString()} miles</SpecPill>
          <SpecPill>{listing.spec.fuelType}</SpecPill>
          <SpecPill>{listing.spec.gearbox}</SpecPill>
        </div>

        <p style={{ ...sans, fontSize: 22, fontWeight: 700, color: palette.ink, marginTop: 12 }}>
          £{listing.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap" style={{ ...sans, fontSize: 12.5, color: palette.slate }}>
          <span className="flex items-center gap-1"><MapPin size={13} />{listing.location}</span>
          {typeof distance === "number" && (
            <span className="flex items-center gap-1" style={{ color: palette.ink, fontWeight: 500 }}>
              <Navigation size={12} />{distance.toFixed(1)} mi away
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${palette.line}` }}>
          {listing.trust.motVerified && <TrustBadge ok label="MOT verified" icon={FileCheck2} />}
          {listing.trust.hpiClear && <TrustBadge ok label="HPI clear" icon={ShieldCheck} />}
          {!listing.trust.accidentFree && <TrustBadge ok={false} label="Prior accident" icon={AlertTriangle} />}
        </div>
      </div>

      <label
        className="flex items-center gap-2 px-4 py-3"
        style={{
          borderTop: `1px solid ${palette.line}`, ...sans, fontSize: 13,
          color: compareDisabled ? palette.slateLight : palette.ink,
          cursor: compareDisabled ? "not-allowed" : "pointer",
        }}
        onClick={(e) => e.stopPropagation()}
        title={compareDisabled ? "You can compare up to 4 at a time" : undefined}
      >
        <input type="checkbox" checked={compared} disabled={compareDisabled} onChange={() => onToggleCompare(listing.id)} />
        Compare
      </label>
    </div>
  );
}

function OfferModal({ listing, currentOffer, onClose, onConfirm }) {
  const [amount, setAmount] = useState(currentOffer?.amount ? String(currentOffer.amount) : "");
  const [message, setMessage] = useState("");
  const numericAmount = Number(amount);
  const canConfirm = amount && numericAmount > 0;

  const inputStyle = {
    border: `1px solid ${palette.line}`, background: "#fff", ...sans, fontSize: 13.5,
    padding: "8px 10px", borderRadius: 2, width: "100%",
  };
  const labelStyle = { ...sans, fontSize: 12, color: palette.slate, marginBottom: 4, display: "block" };

  const diff = canConfirm ? numericAmount - listing.price : null;
  const diffPct = canConfirm ? Math.round((diff / listing.price) * 100) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,36,48,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-sm p-6 relative"
        style={{ background: palette.paper, border: `1px solid ${palette.line}` }}
      >
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: palette.slate }}>
          <X size={18} />
        </button>
        <h2 style={{ ...serif, fontSize: 20, color: palette.ink, marginBottom: 4 }}>Make an offer</h2>
        <p style={{ ...sans, fontSize: 12.5, color: palette.slateLight, marginBottom: 16 }}>
          {listing.year} {listing.make} {listing.model} — asking £{listing.price.toLocaleString()}
        </p>

        <div className="mb-3">
          <label style={labelStyle}>Your offer (£)</label>
          <input
            type="number"
            style={inputStyle}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(listing.price)}
          />
          {canConfirm && diff !== 0 && (
            <p style={{ ...sans, fontSize: 11.5, color: diff < 0 ? palette.warn : palette.slate, marginTop: 5 }}>
              {diff < 0 ? `£${Math.abs(diff).toLocaleString()} (${Math.abs(diffPct)}%) below asking` : `£${diff.toLocaleString()} (${diffPct}%) above asking`}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label style={labelStyle}>Message (optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explain your offer, or ask about flexibility on price…"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => canConfirm && onConfirm({ amount: numericAmount, message })}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-sm"
            style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}`, opacity: canConfirm ? 1 : 0.5 }}
          >
            Send offer
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-sm" style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.slate }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferStatusPanel({ offer, askingPrice, onRespond }) {
  if (!offer) return null;

  if (offer.status === "pending") {
    return (
      <div className="p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: palette.amberBg, borderBottom: `1px solid ${palette.line}` }}>
        <p style={{ ...sans, fontSize: 12.5, color: palette.ink }}>
          Offer of <strong>£{offer.amount.toLocaleString()}</strong> pending (asking £{askingPrice.toLocaleString()}).
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onRespond("accepted")}
            className="px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 12, fontWeight: 500, background: palette.ink, color: "#fff" }}
          >
            Accept offer
          </button>
          <button
            onClick={() => onRespond("declined")}
            className="px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 12, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.slate }}
          >
            Decline
          </button>
        </div>
      </div>
    );
  }
  if (offer.status === "accepted") {
    return (
      <div className="p-3" style={{ background: palette.verifiedBg, borderBottom: `1px solid ${palette.verified}33` }}>
        <p style={{ ...sans, fontSize: 12.5, color: palette.verified, fontWeight: 500 }}>
          ✓ Offer of £{offer.amount.toLocaleString()} accepted — payment protection below now reflects this price.
        </p>
      </div>
    );
  }
  return (
    <div className="p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: palette.paperDim, borderBottom: `1px solid ${palette.line}` }}>
      <p style={{ ...sans, fontSize: 12.5, color: palette.slate }}>
        Offer of £{offer.amount.toLocaleString()} was declined. Asking price remains £{askingPrice.toLocaleString()}.
      </p>
    </div>
  );
}

function InspectionBookingModal({ listing, professionalPrice, onClose, onConfirm }) {
  const [type, setType] = useState("inperson"); // inperson | professional
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const canConfirm = date && time;

  const inputStyle = {
    border: `1px solid ${palette.line}`, background: "#fff", ...sans, fontSize: 13.5,
    padding: "8px 10px", borderRadius: 2, width: "100%",
  };
  const labelStyle = { ...sans, fontSize: 12, color: palette.slate, marginBottom: 4, display: "block" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,36,48,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-sm p-6 relative"
        style={{ background: palette.paper, border: `1px solid ${palette.line}`, maxHeight: "85vh", overflowY: "auto" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: palette.slate }}>
          <X size={18} />
        </button>
        <h2 style={{ ...serif, fontSize: 20, color: palette.ink, marginBottom: 4 }}>Book an inspection</h2>
        <p style={{ ...sans, fontSize: 12.5, color: palette.slateLight, marginBottom: 16 }}>
          {listing.year} {listing.make} {listing.model} — sent to {listing.seller.name}
        </p>

        <div className="mb-4">
          <label style={labelStyle}>Who's inspecting?</label>
          <div className="space-y-2">
            <label
              className="flex items-start gap-2.5 p-3 rounded-sm cursor-pointer"
              style={{ border: `${type === "inperson" ? 2 : 1}px solid ${type === "inperson" ? palette.lineBold : palette.line}`, background: type === "inperson" ? palette.amberBg : "#fff" }}
            >
              <input type="radio" checked={type === "inperson"} onChange={() => setType("inperson")} style={{ marginTop: 3 }} />
              <div>
                <p style={{ ...sans, fontSize: 13, fontWeight: 500, color: palette.ink }}>1. In person — free</p>
                <p style={{ ...sans, fontSize: 11.5, color: palette.slateLight, marginTop: 2 }}>
                  You inspect the car yourself when you meet the seller. Follow the safe-meetup guidance in your chat.
                </p>
              </div>
            </label>
            <label
              className="flex items-start gap-2.5 p-3 rounded-sm cursor-pointer"
              style={{ border: `${type === "professional" ? 2 : 1}px solid ${type === "professional" ? palette.lineBold : palette.line}`, background: type === "professional" ? palette.amberBg : "#fff" }}
            >
              <input type="radio" checked={type === "professional"} onChange={() => setType("professional")} style={{ marginTop: 3 }} />
              <div>
                <p style={{ ...sans, fontSize: 13, fontWeight: 500, color: palette.ink }}>2. By a professional — £{professionalPrice}</p>
                <p style={{ ...sans, fontSize: 11.5, color: palette.slateLight, marginTop: 2 }}>
                  An independent inspector checks the car and sends you a report before you commit.
                </p>
              </div>
            </label>
          </div>
        </div>

        {type === "professional" && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: palette.verifiedBg, border: `1px solid ${palette.verified}33` }}>
            <div className="flex items-center justify-between">
              <span style={{ ...sans, fontSize: 12.5, color: palette.ink }}>Independent inspection report</span>
              <span style={{ ...sans, fontSize: 13, fontWeight: 600, color: palette.ink }}>£{professionalPrice.toFixed(2).replace(/\.00$/, "")}</span>
            </div>
            <p style={{ ...sans, fontSize: 11, color: palette.slate, marginTop: 6 }}>
              Fixed quote, arranged via partner. You'll be asked to confirm payment once the seller accepts your requested time — nothing is charged yet.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Time</label>
            <input type="time" style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="mb-5">
          <label style={labelStyle}>Message (optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 70 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={type === "professional" ? "Anything the inspector should pay particular attention to?" : "Anything you'd like the seller to know before you meet?"}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => canConfirm && onConfirm({ type, date, time, message })}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-sm"
            style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}`, opacity: canConfirm ? 1 : 0.5 }}
          >
            {type === "professional" ? "Request professional inspection" : "Request inspection"}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-sm" style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.slate }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Rows shown in the comparison table. `get` returns a display string; `better`
// (optional) marks which direction is preferable so we can highlight the
// standout value — only used where "better" is genuinely unambiguous.
const COMPARE_ROWS = [
  { label: "Price", get: (l) => `£${l.price.toLocaleString()}`, raw: (l) => l.price, better: "low" },
  { label: "Year", get: (l) => l.year, raw: (l) => l.year, better: "high" },
  { label: "Mileage", get: (l) => `${l.mileage.toLocaleString()} mi`, raw: (l) => l.mileage, better: "low" },
  { label: "Fuel type", get: (l) => l.spec.fuelType },
  { label: "Gearbox", get: (l) => l.spec.gearbox },
  { label: "Body type", get: (l) => l.spec.bodyType },
  { label: "Engine size", get: (l) => (l.spec.engineSize == null ? "—" : l.vehicleType === "Motorcycle" ? `${l.spec.engineSize}cc` : `${l.spec.engineSize}L`) },
  { label: "Power", get: (l) => (l.spec.power == null ? "—" : `${l.spec.power} bhp`), raw: (l) => l.spec.power, better: "high" },
  { label: "CO2", get: (l) => (l.spec.co2 == null ? "—" : `${l.spec.co2} g/km`), raw: (l) => l.spec.co2, better: "low" },
  { label: "Seats", get: (l) => l.spec.seats ?? "—" },
  { label: "Doors", get: (l) => l.spec.doors ?? "—" },
  { label: "Boot space", get: (l) => (l.spec.bootSpace == null ? "—" : `${l.spec.bootSpace} L`), raw: (l) => l.spec.bootSpace, better: "high" },
  { label: "Load volume", get: (l) => (l.spec.loadVolume == null ? "—" : `${l.spec.loadVolume} m³`), raw: (l) => l.spec.loadVolume, better: "high" },
  { label: "Payload", get: (l) => (l.spec.payload == null ? "—" : `${l.spec.payload} kg`), raw: (l) => l.spec.payload, better: "high" },
  { label: "Battery range", get: (l) => (l.spec.batteryRange == null ? "—" : `${l.spec.batteryRange} mi`), raw: (l) => l.spec.batteryRange, better: "high" },
  { label: "Owners", get: (l) => l.seller.ownerCount, raw: (l) => l.seller.ownerCount, better: "low" },
  { label: "Location", get: (l) => l.location },
];

function CompareView({ listings, onBack, onOpen, onRemove, onClearAll }) {
  // 5-year running cost is expensive-ish to compute, so memoize per listing set.
  const costs = useMemo(
    () => Object.fromEntries(listings.map((l) => [l.id, projectRunningCosts(l, 5)])),
    [listings]
  );

  // Only show rows where at least one vehicle has a real value — avoids a wall
  // of "—" when comparing, say, three petrol cars (no battery range, no payload).
  const visibleRows = COMPARE_ROWS.filter((row) =>
    listings.some((l) => {
      const v = row.get(l);
      return v !== "—" && v != null;
    })
  );

  function bestId(row) {
    if (!row.better || !row.raw) return null;
    const vals = listings
      .map((l) => ({ id: l.id, v: row.raw(l) }))
      .filter((x) => typeof x.v === "number" && !Number.isNaN(x.v));
    if (vals.length < 2) return null;
    const sorted = [...vals].sort((a, b) => (row.better === "low" ? a.v - b.v : b.v - a.v));
    // No highlight if everything ties.
    if (sorted[0].v === sorted[sorted.length - 1].v) return null;
    return sorted[0].id;
  }

  const cellStyle = { ...sans, fontSize: 13, color: palette.ink, padding: "10px 12px", borderBottom: `1px solid ${palette.line}` };
  const labelStyle = { ...sans, fontSize: 12, fontWeight: 600, color: palette.slate, padding: "10px 12px", borderBottom: `1px solid ${palette.line}`, whiteSpace: "nowrap" };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <button onClick={onBack} className="flex items-center gap-1" style={{ ...sans, fontSize: 13.5, color: palette.slate }}>
          <ChevronLeft size={16} /> Back to listings
        </button>
        <button onClick={onClearAll} style={{ ...sans, fontSize: 12.5, fontWeight: 500, color: palette.amberInk }}>
          Clear comparison
        </button>
      </div>

      <h2 style={{ ...serif, fontSize: 26, color: palette.ink, marginBottom: 4 }}>Compare vehicles</h2>
      <p style={{ ...sans, fontSize: 13, color: palette.slate, marginBottom: 20 }}>
        {listings.length} selected. Best value in each row is highlighted where there's a clear winner.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ ...labelStyle, textAlign: "left", background: palette.paperDim }} />
              {listings.map((l) => (
                <th key={l.id} style={{ padding: "12px", borderBottom: `1px solid ${palette.line}`, background: palette.paperDim, textAlign: "left", verticalAlign: "top", minWidth: 150 }}>
                  <div className="h-20 w-full rounded-sm overflow-hidden mb-2 flex items-center justify-center px-2" style={{ background: l.color }}>
                    {l.images?.length > 0
                      ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                      : <VehicleArt type={l.vehicleType} accent="#FFFFFF" seed={l.id} />}
                  </div>
                  <button onClick={() => onOpen(l)} className="text-left">
                    <p style={{ ...sans, fontSize: 13, fontWeight: 700, color: palette.ink }}>{l.make} {l.model}</p>
                  </button>
                  <button
                    onClick={() => onRemove(l.id)}
                    className="flex items-center gap-1 mt-1"
                    style={{ ...sans, fontSize: 11, color: palette.slate }}
                  >
                    <X size={11} /> Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const winner = bestId(row);
              return (
                <tr key={row.label}>
                  <td style={{ ...labelStyle, textAlign: "left" }}>{row.label}</td>
                  {listings.map((l) => {
                    const isBest = winner === l.id;
                    return (
                      <td
                        key={l.id}
                        style={{
                          ...cellStyle,
                          background: isBest ? palette.verifiedBg : "transparent",
                          fontWeight: isBest ? 700 : 400,
                          color: isBest ? palette.verified : palette.ink,
                        }}
                      >
                        {row.get(l)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            <tr>
              <td style={{ ...labelStyle, textAlign: "left" }}>5-yr running cost</td>
              {listings.map((l) => {
                const totals = listings.map((x) => costs[x.id].fiveYearTotal);
                const min = Math.min(...totals);
                const allSame = min === Math.max(...totals);
                const isBest = !allSame && costs[l.id].fiveYearTotal === min;
                return (
                  <td
                    key={l.id}
                    style={{
                      ...cellStyle,
                      background: isBest ? palette.verifiedBg : "transparent",
                      fontWeight: isBest ? 700 : 400,
                      color: isBest ? palette.verified : palette.ink,
                    }}
                  >
                    £{costs[l.id].fiveYearTotal.toLocaleString()}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td style={{ ...labelStyle, textAlign: "left" }}>Verification</td>
              {listings.map((l) => (
                <td key={l.id} style={cellStyle}>
                  <div className="flex flex-col gap-1">
                    {l.trust.motVerified && <TrustBadge ok label="MOT verified" icon={FileCheck2} />}
                    {l.trust.hpiClear && <TrustBadge ok label="HPI clear" icon={ShieldCheck} />}
                    {!l.trust.accidentFree && <TrustBadge ok={false} label="Prior accident" icon={AlertTriangle} />}
                    {!l.trust.motVerified && <TrustBadge ok={false} label="Pending" icon={AlertTriangle} />}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ ...sans, fontSize: 10.5, color: palette.slateLight, marginTop: 14 }}>
        Running-cost figures are the illustrative 5-year estimates shown on each listing — useful for ranking these vehicles against each other, not a quote.
      </p>
    </div>
  );
}

function ListingDetail({ listing, onBack, onMessage, onBookInspection, onMakeOffer }) {
  const [activeImg, setActiveImg] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const photos = listing.images ?? [];
  const hasPhotos = photos.length > 0;
  // Clamp so a stale index can never render a broken <img>.
  const safeIndex = Math.min(activeImg, Math.max(0, photos.length - 1));

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-4"
        style={{ ...sans, fontSize: 13.5, color: palette.slate }}
      >
        <ChevronLeft size={16} /> Back to listings
      </button>

      {hasPhotos ? (
        <div className="mb-6">
          <div className="h-56 rounded-sm overflow-hidden mb-2">
            <img src={photos[safeIndex]} alt={`${listing.make} ${listing.model}`} className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className="h-14 w-20 rounded-sm overflow-hidden flex-shrink-0"
                style={{ border: `2px solid ${i === safeIndex ? palette.amber : "transparent"}` }}
              >
                <img src={src} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-56 rounded-sm flex items-center justify-center mb-6 px-10" style={{ background: listing.color }}>
          <VehicleArt type={listing.vehicleType} accent="#FFFFFF" seed={listing.id} />
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 style={{ ...serif, fontSize: 26, color: palette.ink }}>{listing.year} {listing.make} {listing.model}</h2>
          <div className="flex items-center gap-3 mt-2" style={{ ...sans, fontSize: 13.5, color: palette.slate }}>
            <span className="flex items-center gap-1"><Gauge size={14} />{listing.mileage.toLocaleString()} miles</span>
            <span className="flex items-center gap-1"><MapPin size={14} />{listing.location}</span>
            <span className="flex items-center gap-1"><Users size={14} />{listing.seller.ownerCount} owner{listing.seller.ownerCount > 1 ? "s" : ""}</span>
          </div>
        </div>
        <p style={{ ...sans, fontSize: 28, fontWeight: 600, color: palette.ink }}>£{listing.price.toLocaleString()}</p>
      </div>

      {/* Verified facts panel — visually distinct from seller's own words */}
      <div className="mt-6 rounded-sm p-5" style={{ background: palette.verifiedBg, border: `1px solid ${palette.verified}22` }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={17} style={{ color: palette.verified }} />
          <h3 style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.verified }}>Verified against official records</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <TrustBadge ok={listing.trust.motVerified} label="MOT history" icon={FileCheck2} />
          <TrustBadge ok={listing.trust.mileageVerified} label="Mileage match" icon={Gauge} />
          <TrustBadge ok={listing.trust.hpiClear} label="HPI clear" icon={ShieldCheck} />
          <TrustBadge ok={listing.trust.accidentFree} label={listing.trust.accidentFree ? "No accidents on record" : "Prior accident recorded"} icon={AlertTriangle} />
        </div>
        <p style={{ ...sans, fontSize: 12, color: palette.slate }}>Sourced from DVSA MOT history and vehicle registration records — not entered by the seller.</p>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${palette.verified}22` }}>
          <p style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: palette.ink, marginBottom: 8 }}>MOT test timeline</p>
          <div className="space-y-2">
            {listing.motHistory.map((m, i) => (
              <div key={i} className="flex items-center justify-between" style={{ ...sans, fontSize: 12.5, color: palette.slate }}>
                <span style={{ minWidth: 80 }}>{m.date}</span>
                <span style={{ minWidth: 90, color: m.result.startsWith("Pass") ? palette.verified : palette.warn, fontWeight: 500 }}>{m.result}</span>
                <span style={{ minWidth: 90 }}>{m.mileage.toLocaleString()} mi</span>
                <span className="flex-1 text-right">{m.notes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-sm p-4 flex items-center gap-2" style={{ background: listing.financeDeclared ? palette.warnBg : palette.paperDim, border: `1px solid ${palette.line}` }}>
        {listing.financeDeclared ? <AlertTriangle size={15} style={{ color: palette.warn }} /> : <ShieldCheck size={15} style={{ color: palette.slate }} />}
        <p style={{ ...sans, fontSize: 12.5, color: listing.financeDeclared ? palette.warn : palette.slate }}>
          {listing.financeDeclared
            ? "Seller declares this car has outstanding finance — this must be settled or disclosed as part of any sale. Confirm via an HPI check before paying."
            : "Seller declares no outstanding finance on this car."}
          {" "}<span style={{ opacity: 0.75 }}>(seller-declared, not independently verified)</span>
        </p>
      </div>

      <div className="mt-6">
        <h3 style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.ink, marginBottom: 6 }}>From the seller</h3>
        <p style={{ ...sans, fontSize: 14, color: palette.slate, lineHeight: 1.6 }}>{listing.description}</p>
      </div>

      <div className="mt-6">
        <h3 style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.ink, marginBottom: 10 }}>Specifications</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 p-4 rounded-sm" style={{ border: `1px solid ${palette.line}` }}>
          <SpecRow label={listing.vehicleType === "Motorcycle" ? "Bike type" : "Body type"} value={listing.spec.bodyType} />
          {listing.vehicleType !== "Motorcycle" && <SpecRow label="Doors" value={listing.spec.doors} />}
          {listing.spec.bootSpace != null && <SpecRow label="Boot space" value={`${listing.spec.bootSpace} L`} />}
          {listing.spec.loadVolume != null && <SpecRow label="Load volume" value={`${listing.spec.loadVolume} m³`} />}
          {listing.spec.payload != null && <SpecRow label="Payload" value={`${listing.spec.payload} kg`} />}
          <SpecRow label="Gearbox" value={listing.spec.gearbox} />
          {listing.spec.colour != null && <SpecRow label="Colour" value={listing.spec.colour} />}
          <SpecRow label="Seats" value={listing.spec.seats} />
          {listing.spec.isofix != null && <SpecRow label="Isofix points" value={listing.spec.isofix} />}
          {listing.spec.licenseCategory != null && <SpecRow label="Licence needed" value={listing.spec.licenseCategory} />}
          <SpecRow label="Fuel type" value={listing.spec.fuelType} />
          {listing.spec.engineSize != null && (
            <SpecRow label="Engine size" value={listing.vehicleType === "Motorcycle" ? `${listing.spec.engineSize}cc` : `${listing.spec.engineSize}L`} />
          )}
          {listing.spec.power != null && <SpecRow label="Power" value={`${listing.spec.power} bhp`} />}
          {listing.spec.co2 != null && <SpecRow label="CO2 emissions" value={`${listing.spec.co2} g/km`} />}
          {listing.spec.batteryRange != null && <SpecRow label="Battery range" value={`${listing.spec.batteryRange} mi`} icon={Battery} />}
          {listing.spec.chargingTime != null && <SpecRow label="Charging time" value={`${listing.spec.chargingTime} hrs (7kW)`} icon={Zap} />}
        </div>
      </div>

      <RunningCostsPanel listing={listing} />

      <div className="mt-6 rounded-sm p-4 flex items-center justify-between flex-wrap gap-3" style={{ border: `1px solid ${palette.line}` }}>
        <div>
          <div className="flex items-center gap-2">
            <p style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.ink }}>{listing.seller.name}</p>
            {listing.seller.verified && <BadgeCheck size={15} style={{ color: palette.verified }} />}
          </div>
          <div className="flex items-center gap-3 mt-1" style={{ ...sans, fontSize: 12, color: palette.slate }}>
            <span>Member since {listing.seller.memberSince}</span>
            <span className="flex items-center gap-1"><Clock size={12} />Replies in {listing.seller.responseTime}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-4 py-2 rounded-sm"
            style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.ink}`, color: palette.ink }}
          >
            Book an inspection
          </button>
          <button
            onClick={() => setShowOfferModal(true)}
            className="px-4 py-2 rounded-sm"
            style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.ink}`, color: palette.ink }}
          >
            Make an offer
          </button>
          <button
            onClick={() => onMessage(listing)}
            className="px-4 py-2 rounded-sm flex items-center gap-1.5"
            style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
          >
            <MessageCircle size={14} /> Message seller
          </button>
        </div>
      </div>

      {showBookingModal && (
        <InspectionBookingModal
          listing={listing}
          professionalPrice={ADD_ONS.find((a) => a.id === "inspection")?.price ?? 129}
          onClose={() => setShowBookingModal(false)}
          onConfirm={(booking) => {
            setShowBookingModal(false);
            onBookInspection(listing, booking);
          }}
        />
      )}

      {showOfferModal && (
        <OfferModal
          listing={listing}
          onClose={() => setShowOfferModal(false)}
          onConfirm={(offer) => {
            setShowOfferModal(false);
            onMakeOffer(listing, offer);
          }}
        />
      )}
    </div>
  );
}

const ADD_ONS = [
  { id: "inspection", name: "Independent inspection report", description: "A qualified inspector checks the car before you commit.", price: 129, icon: ClipboardCheck },
  { id: "warranty", name: "AA-backed extended warranty", description: "12 months mechanical breakdown cover on this car.", price: 199, icon: Wrench },
  { id: "insurance", name: "Day-one insurance cover", description: "Short-term cover so you can drive away same day, arranged via partner.", price: 89, icon: Umbrella },
  { id: "hpi", name: "Full HPI history report", description: "Outstanding finance, write-off status and stolen check.", price: 19.99, icon: FileCheck2 },
];

function DealStatusPanel({ status, price, addOns, onToggleAddOn, onAdvance }) {
  const selectedAddOns = ADD_ONS.filter((a) => addOns.includes(a.id));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const total = price + addOnsTotal;

  if (status === "none") {
    return (
      <div className="p-3" style={{ background: palette.paperDim, borderBottom: `1px solid ${palette.line}` }}>
        <p style={{ ...sans, fontSize: 12, color: palette.slate, marginBottom: 10 }}>
          No payment protection started for this deal yet. Add any extras below, then start protection to hold funds securely.
        </p>
        <div className="space-y-2 mb-3">
          {ADD_ONS.map((addOn) => {
            const Icon = addOn.icon;
            const checked = addOns.includes(addOn.id);
            return (
              <label
                key={addOn.id}
                className="flex items-start gap-2.5 p-2.5 rounded-sm cursor-pointer"
                style={{ background: checked ? palette.amberBg : "#fff", border: `${checked ? 2 : 1}px solid ${checked ? palette.lineBold : palette.line}` }}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggleAddOn(addOn.id)} style={{ marginTop: 3 }} />
                <Icon size={15} style={{ color: palette.ink, marginTop: 1, flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ ...sans, fontSize: 12.5, fontWeight: 500, color: palette.ink }}>{addOn.name}</span>
                    <span style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: palette.ink }}>£{addOn.price.toFixed(2).replace(/\.00$/, "")}</span>
                  </div>
                  <p style={{ ...sans, fontSize: 11, color: palette.slateLight, marginTop: 2 }}>{addOn.description}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={{ ...sans, fontSize: 12.5, color: palette.ink }}>
            Total to protect: <strong>£{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            {addOnsTotal > 0 && <span style={{ color: palette.slateLight }}> (car £{price.toLocaleString()} + extras £{addOnsTotal.toFixed(2)})</span>}
          </span>
          <button
            onClick={() => onAdvance("funds_held")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 12, fontWeight: 500, background: palette.ink, color: "#fff" }}
          >
            <ShieldCheck size={13} /> Start payment protection
          </button>
        </div>
        <p style={{ ...sans, fontSize: 10.5, color: palette.slateLight, marginTop: 8 }}>
          Extras are arranged via partner providers and simulated in this prototype — a live version would connect to real inspection, warranty and insurance partners.
        </p>
      </div>
    );
  }
  if (status === "funds_held") {
    return (
      <div className="p-3" style={{ background: palette.verifiedBg, borderBottom: `1px solid ${palette.verified}33` }}>
        <p style={{ ...sans, fontSize: 12, color: palette.verified }}>
          £{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} held securely — released once the buyer confirms the car matches the listing.
        </p>
        {selectedAddOns.length > 0 && (
          <ul style={{ ...sans, fontSize: 11, color: palette.verified, marginTop: 6, paddingLeft: 16 }}>
            {selectedAddOns.map((a) => (
              <li key={a.id}>{a.name} — £{a.price.toFixed(2).replace(/\.00$/, "")}</li>
            ))}
          </ul>
        )}
        <button
          onClick={() => onAdvance("completed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm mt-3"
          style={{ ...sans, fontSize: 12, fontWeight: 500, border: `1px solid ${palette.verified}`, color: palette.verified }}
        >
          Confirm received — release funds
        </button>
      </div>
    );
  }
  return (
    <div className="p-3" style={{ background: palette.verifiedBg, borderBottom: `1px solid ${palette.verified}33` }}>
      <p style={{ ...sans, fontSize: 12, color: palette.verified, fontWeight: 500 }}>
        ✓ Funds released — deal complete (£{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total{selectedAddOns.length > 0 ? `, including ${selectedAddOns.length} extra${selectedAddOns.length > 1 ? "s" : ""}` : ""}).
      </p>
    </div>
  );
}

function Messages({ threads, listings, activeId, setActiveId, onSend, onSetDealStatus, onToggleAddOn, onRespondToOffer, buyerName }) {
  const [draft, setDraft] = useState("");
  const [showSafetyTip, setShowSafetyTip] = useState(true);
  const [billText, setBillText] = useState("");
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState("");
  const [showBillModal, setShowBillModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const listing = listings.find((l) => l.id === activeId);
  const thread = threads[activeId] || { dealStatus: "none", messages: [] };

  async function generateBillOfSale() {
    setBillLoading(true);
    setBillError("");
    setShowBillModal(true);
    try {
      const selectedAddOns = ADD_ONS.filter((a) => (thread.addOns || []).includes(a.id));
      const addOnsLine = selectedAddOns.length > 0
        ? `- Add-on services included: ${selectedAddOns.map((a) => `${a.name} (£${a.price.toFixed(2).replace(/\.00$/, "")})`).join(", ")}`
        : "- No add-on services included";
      const prompt = `Write a simple UK private-party vehicle bill of sale / sale receipt, plain text, ready to print and sign.

Include these fields exactly as given, and leave a blank line with "____________" for anything not provided:
- Vehicle: ${listing.year} ${listing.make} ${listing.model}
- Registration: ${listing.registration || "____________"}
- Mileage at sale: ${listing.mileage} miles
- Agreed price: £${listing.price}
${addOnsLine}
- Seller: ${listing.seller.name}
- Buyer: ${buyerName || "____________"}
- Date of sale: leave blank for them to fill in
- Include a standard "sold as seen, no warranty implied unless separately agreed" clause (note separately if a warranty add-on was purchased, since that overrides "no warranty" for the covered period)
- Include signature lines for both buyer and seller

Return only the document text, no preamble or explanation.`;
      setBillText(await generateText(prompt));
    } catch (err) {
      setBillError("Couldn't generate the document just now — try again.");
    } finally {
      setBillLoading(false);
    }
  }

  function copyBill() {
    navigator.clipboard?.writeText(billText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ minHeight: 420 }}>
      <div className="sm:col-span-1 rounded-sm overflow-hidden" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
        {Object.keys(threads).length === 0 && (
          <p style={{ ...sans, fontSize: 13, color: palette.slateLight, padding: 16 }}>No conversations yet.</p>
        )}
        {Object.keys(threads).map((id) => {
          const l = listings.find((x) => x.id === Number(id));
          if (!l) return null;
          return (
            <button
              key={id}
              onClick={() => setActiveId(Number(id))}
              className="w-full text-left p-3 flex flex-col gap-0.5"
              style={{ borderBottom: `1px solid ${palette.line}`, background: Number(id) === activeId ? palette.paperDim : "transparent" }}
            >
              <span style={{ ...sans, fontWeight: 600, fontSize: 13, color: palette.ink }}>{l.seller.name}</span>
              <span style={{ ...sans, fontSize: 12, color: palette.slate }}>{l.year} {l.make} {l.model}</span>
            </button>
          );
        })}
      </div>

      <div className="sm:col-span-2 rounded-sm flex flex-col overflow-hidden" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
        {!listing ? (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ ...sans, fontSize: 13, color: palette.slateLight }}>Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="p-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: `1px solid ${palette.line}` }}>
              <div>
                <p style={{ ...sans, fontWeight: 600, fontSize: 13.5, color: palette.ink }}>{listing.seller.name}</p>
                <p style={{ ...sans, fontSize: 12, color: palette.slate }}>Re: {listing.year} {listing.make} {listing.model} — £{listing.price.toLocaleString()}</p>
              </div>
              <button
                onClick={generateBillOfSale}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm"
                style={{ ...sans, fontSize: 11.5, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.ink }}
              >
                <FileText size={12} /> Generate bill of sale
              </button>
            </div>

            <OfferStatusPanel
              offer={thread.offer}
              askingPrice={listing.price}
              onRespond={(status) => onRespondToOffer(activeId, status)}
            />

            <DealStatusPanel
              status={thread.dealStatus}
              price={thread.offer?.status === "accepted" ? thread.offer.amount : listing.price}
              addOns={thread.addOns || []}
              onToggleAddOn={(addOnId) => onToggleAddOn(activeId, addOnId)}
              onAdvance={(s) => onSetDealStatus(activeId, s)}
            />

            {showSafetyTip && (
              <div className="p-3 flex items-start gap-2" style={{ background: palette.amberBg, borderBottom: `1px solid ${palette.line}` }}>
                <ShieldAlert size={14} style={{ color: palette.amberInk, marginTop: 1, flexShrink: 0 }} />
                <p style={{ ...sans, fontSize: 11.5, color: palette.ink, flex: 1 }}>
                  Meeting up? Choose a public, well-lit place, bring someone with you, and never pay before you've seen the car in person and checked it matches the listing.
                </p>
                <button onClick={() => setShowSafetyTip(false)} style={{ color: palette.slateLight, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 260 }}>
              {thread.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="px-3 py-2 rounded-sm max-w-[75%]"
                    style={{
                      background: m.from === "me" ? palette.ink : palette.paperDim,
                      color: m.from === "me" ? "#fff" : palette.ink,
                      whiteSpace: "pre-line",
                      ...sans,
                      fontSize: 13.5,
                    }}
                  >
                    {m.text}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3 }}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${palette.line}` }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    onSend(activeId, draft);
                    setDraft("");
                  }
                }}
                placeholder="Write a message…"
                className="flex-1 px-3 py-2 rounded-sm outline-none"
                style={{ border: `1px solid ${palette.line}`, ...sans, fontSize: 13.5 }}
              />
              <button
                onClick={() => {
                  if (draft.trim()) {
                    onSend(activeId, draft);
                    setDraft("");
                  }
                }}
                className="px-3 rounded-sm flex items-center justify-center"
                style={{ background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
              >
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {showBillModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(27,36,48,0.45)" }}
          onClick={() => setShowBillModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-sm p-5 relative"
            style={{ background: palette.paper, border: `1px solid ${palette.line}`, maxHeight: "80vh", overflowY: "auto" }}
          >
            <button onClick={() => setShowBillModal(false)} className="absolute top-4 right-4" style={{ color: palette.slate }}>
              <X size={18} />
            </button>
            <h3 style={{ ...serif, fontSize: 18, color: palette.ink, marginBottom: 10 }}>Bill of sale</h3>
            {billLoading && <p style={{ ...sans, fontSize: 13, color: palette.slate }}>Drafting the document…</p>}
            {billError && <p style={{ ...sans, fontSize: 12.5, color: "#B4432E" }}>{billError}</p>}
            {billText && !billLoading && (
              <>
                <pre style={{ ...sans, fontSize: 12.5, color: palette.ink, whiteSpace: "pre-wrap", background: palette.paperDim, padding: 12, borderRadius: 2, border: `1px solid ${palette.line}` }}>
                  {billText}
                </pre>
                <button
                  onClick={copyBill}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-sm mt-3"
                  style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
                >
                  <Copy size={13} /> {copied ? "Copied!" : "Copy text"}
                </button>
                <p style={{ ...sans, fontSize: 11, color: palette.slateLight, marginTop: 8 }}>
                  AI-drafted starting point, not legal advice — review the details before signing.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simulated DVLA Vehicle Enquiry Service response — a real build would call the
// official VES API from a backend (it needs an API key, so it can't be called
// directly from browser code) and would cover every UK-registered plate.
const MOCK_DVLA_DATABASE = {
  "LM19XYZ": { vehicleType: "Car", make: "Volkswagen", model: "Golf", year: 2019, colour: "Grey", fuelType: "Diesel", bodyType: "Hatchback", engineSize: 2.0, co2: 119, basePrice: 15000 },
  "BD20ABC": { vehicleType: "Car", make: "Toyota", model: "Corolla", year: 2020, colour: "White", fuelType: "Hybrid", bodyType: "Hatchback", engineSize: 1.8, co2: 96, basePrice: 18500 },
  "KX68DEF": { vehicleType: "Car", make: "Ford", model: "Focus", year: 2018, colour: "Orange", fuelType: "Petrol", bodyType: "Hatchback", engineSize: 1.5, co2: 134, basePrice: 14000 },
  "SN21GHI": { vehicleType: "Car", make: "Nissan", model: "Leaf", year: 2021, colour: "Blue", fuelType: "Electric", bodyType: "Hatchback", engineSize: null, co2: 0, basePrice: 21000 },
  "MC21JKL": { vehicleType: "Motorcycle", make: "Kawasaki", model: "Z650", year: 2021, colour: "Green", fuelType: "Petrol", bodyType: "Naked", engineSize: 649, co2: 98, basePrice: 6200 },
  "VN20MNO": { vehicleType: "Van", make: "Ford", model: "Transit Custom", year: 2020, colour: "White", fuelType: "Diesel", bodyType: "Panel van", engineSize: 2.0, co2: 189, basePrice: 18000 },
};

// Very rough illustrative depreciation model — a real version would come from
// a proper valuation data provider (e.g. CAP HPI, Cazana), not a hand-rolled formula.
const AVG_MILES_PER_YEAR = 8000;

function estimateValue(basePrice, year, mileage) {
  const age = Math.max(0, new Date().getFullYear() - year);
  const ageAdjusted = basePrice * Math.pow(0.87, age); // ~13%/yr depreciation

  // Adjust against expected mileage for the car's age: cars under it gain a
  // little, cars over it lose more. Capped both ways so extreme inputs don't
  // produce silly numbers.
  const expectedMiles = age * AVG_MILES_PER_YEAR;
  const diff = mileage - expectedMiles;
  const rate = diff > 0 ? 0.05 : 0.03; // over-mileage penalised harder than low mileage rewards
  const rawAdjustment = -diff * rate;
  const cap = ageAdjusted * 0.2; // never move value more than ±20% on mileage alone
  const mileageAdjustment = Math.max(-cap, Math.min(cap, rawAdjustment));

  const mid = Math.max(500, Math.round((ageAdjusted + mileageAdjustment) / 50) * 50);
  return { low: Math.round(mid * 0.9), high: Math.round(mid * 1.1) };
}

const VEHICLE_TYPES = ["Car", "Motorcycle", "Van"];

const BODY_TYPES_BY_VEHICLE = {
  Car: ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible"],
  Motorcycle: ["Naked", "Sports", "Adventure", "Cruiser", "Tourer", "Scooter"],
  Van: ["Panel van", "Pickup", "Minibus", "Crew van"],
};

const FUEL_TYPES_BY_VEHICLE = {
  Car: ["Petrol", "Diesel", "Hybrid", "Electric"],
  Motorcycle: ["Petrol", "Electric"],
  Van: ["Petrol", "Diesel", "Hybrid", "Electric"],
};

const LICENSE_CATEGORIES = ["AM", "A1", "A2", "A"];

function AddListingForm({ onSubmit, onCancel, submitLabel = "Publish listing", hideCancel = false }) {
  const [form, setForm] = useState({
    vehicleType: "Car",
    make: "", model: "", year: "", price: "", mileage: "", location: "",
    bodyType: "Hatchback", fuelType: "Petrol", gearbox: "Manual",
    doors: "5", seats: "5", colour: "", engineSize: "", co2: "",
    licenseCategory: "A2", loadVolume: "", payload: "",
    hasFinance: "no", description: "",
  });
  const [regNumber, setRegNumber] = useState("");
  const [regStatus, setRegStatus] = useState("idle"); // idle | loading | found | notfound
  const [basePrice, setBasePrice] = useState(null); // from lookup; drives the live estimate
  const [images, setImages] = useState([]); // data URLs, max 10
  const [imageError, setImageError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Derived, not stored — the estimate recalculates whenever the seller edits
  // year or mileage, rather than freezing at whatever was set during lookup.
  const estimate = useMemo(() => {
    if (basePrice == null) return null;
    const year = Number(form.year);
    const mileage = Number(form.mileage);
    if (!year || !form.mileage || Number.isNaN(mileage)) return null;
    return estimateValue(basePrice, year, mileage);
  }, [basePrice, form.year, form.mileage]);

  // What's still needed before we can show a price estimate.
  const estimateBlockedBy = useMemo(() => {
    if (basePrice == null) return "lookup";
    if (!form.year) return "year";
    if (!form.mileage) return "mileage";
    return null;
  }, [basePrice, form.year, form.mileage]);

  function lookupRegistration() {
    const key = regNumber.replace(/\s+/g, "").toUpperCase();
    if (!key) return;
    setRegStatus("loading");
    setBasePrice(null);
    setTimeout(() => {
      const match = MOCK_DVLA_DATABASE[key];
      if (match) {
        setForm((f) => ({
          ...f,
          vehicleType: match.vehicleType,
          make: match.make,
          model: match.model,
          year: String(match.year),
          bodyType: match.bodyType,
          fuelType: match.fuelType,
          colour: match.colour,
          engineSize: match.engineSize != null ? String(match.engineSize) : "",
          co2: match.co2 != null ? String(match.co2) : "",
        }));
        setBasePrice(match.basePrice ?? null);
        setRegStatus("found");
      } else {
        setRegStatus("notfound");
      }
    }, 700);
  }

  function updateVehicleType(type) {
    setForm((f) => ({
      ...f,
      vehicleType: type,
      bodyType: BODY_TYPES_BY_VEHICLE[type][0],
      fuelType: FUEL_TYPES_BY_VEHICLE[type][0],
    }));
  }


  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const room = MAX_IMAGES - images.length;
    if (files.length > room) {
      setImageError(`You can add up to ${MAX_IMAGES} photos — only added the first ${room}.`);
    } else {
      setImageError("");
    }
    const toRead = files.slice(0, room);
    if (toRead.length === 0) return;

    // Read all files in parallel but append in the order the user selected them.
    // The previous version appended from each onload callback, so a small file
    // could land before a large one and silently reorder the photos.
    Promise.all(
      toRead.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      const valid = results.filter(Boolean);
      if (valid.length < toRead.length) {
        setImageError("Some photos couldn't be read and were skipped.");
      }
      setImages((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    });

    e.target.value = "";
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function generateDescription() {
    setGenerating(true);
    setGenError("");
    try {
      const vehicleNoun = { Car: "car", Motorcycle: "motorcycle", Van: "van" }[form.vehicleType] || "vehicle";
      const doorsSeatsLine = form.vehicleType === "Motorcycle"
        ? `- Seats: ${form.seats}${form.licenseCategory ? `, licence needed: ${form.licenseCategory}` : ""}`
        : `- Doors: ${form.doors}, Seats: ${form.seats}`;
      const engineLine = form.vehicleType === "Motorcycle"
        ? `- Engine: ${form.engineSize ? `${form.engineSize}cc` : "not given"}`
        : `- Engine size: ${form.engineSize ? `${form.engineSize}L` : "not given"}`;
      const vanLine = form.vehicleType === "Van" && (form.loadVolume || form.payload)
        ? `\n- Load volume: ${form.loadVolume ? `${form.loadVolume}m³` : "not given"}, Payload: ${form.payload ? `${form.payload}kg` : "not given"}`
        : "";

      const prompt = `Write a used-${vehicleNoun} listing description for a private seller (not a dealer), 3-4 sentences, honest and inviting in tone, no exaggerated sales language.

Details:
- ${form.year} ${form.make} ${form.model}
- Body/type: ${form.bodyType}
- Fuel: ${form.fuelType}
- Gearbox: ${form.gearbox}
${doorsSeatsLine}
${engineLine}${vanLine}
- Mileage: ${form.mileage ? `${form.mileage} miles` : "not given"}
- Asking price: ${form.price ? `£${form.price}` : "not given"}

Only use the facts given above — do not invent specific claims about condition, service history, accidents, or ownership, since those aren't provided. Keep it general and welcoming rather than fabricating specifics. Return only the description text, nothing else.`;

      update("description", await generateText(prompt));
    } catch (err) {
      setGenError("Something went wrong generating the description.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.make || !form.model || !form.price || !form.year) return;
    onSubmit({ ...form, images, registration: regNumber.replace(/\s+/g, "").toUpperCase() });
  }

  const inputStyle = {
    border: `1px solid ${palette.line}`, background: "#fff", ...sans, fontSize: 13.5,
    padding: "8px 10px", borderRadius: 2, width: "100%",
  };
  const labelStyle = { ...sans, fontSize: 12, color: palette.slate, marginBottom: 4, display: "block" };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-5" style={{ border: `2px solid ${palette.pink}`, background: "#fff" }}>
      <h3 style={{ ...serif, fontSize: 18, color: palette.ink, marginBottom: 14 }}>List your vehicle</h3>

      <div className="mb-5">
        <label style={{ ...sans, fontSize: 12, color: palette.slate, marginBottom: 6, display: "block" }}>Vehicle type</label>
        <div className="flex gap-2">
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateVehicleType(type)}
              className="px-4 py-2 rounded-sm"
              style={{
                ...sans, fontSize: 13, fontWeight: 500,
                background: form.vehicleType === type ? palette.ink : "#fff",
                color: form.vehicleType === type ? "#fff" : palette.ink,
                border: `1px solid ${form.vehicleType === type ? palette.ink : palette.line}`,
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 p-4 rounded-sm" style={{ background: palette.paperDim, border: `1px solid ${palette.line}` }}>
        <label style={labelStyle}>Registration number</label>
        <div className="flex gap-2">
          <input
            style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, maxWidth: 180 }}
            value={regNumber}
            onChange={(e) => { setRegNumber(e.target.value); setRegStatus("idle"); }}
            placeholder="e.g. LM19 XYZ"
          />
          <button
            type="button"
            onClick={lookupRegistration}
            disabled={!regNumber.trim() || regStatus === "loading"}
            className="px-4 py-2 rounded-sm flex items-center gap-1.5 flex-shrink-0"
            style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.ink, color: "#fff", opacity: !regNumber.trim() || regStatus === "loading" ? 0.5 : 1 }}
          >
            <Search size={14} />
            {regStatus === "loading" ? "Looking up…" : "Look up"}
          </button>
        </div>
        {regStatus === "found" && (
          <p style={{ ...sans, fontSize: 12, color: palette.verified, marginTop: 8 }}>
            Vehicle found — we've filled in make, model, year, body type, fuel type, colour, engine size and CO2 below. Add your mileage and we'll suggest a price.
          </p>
        )}
        {regStatus === "notfound" && (
          <p style={{ ...sans, fontSize: 12, color: palette.warn, marginTop: 8 }}>
            No match for that registration in this demo — try LM19 XYZ, BD20 ABC, KX68 DEF, SN21 GHI (cars), MC21 JKL (motorcycle) or VN20 MNO (van), or just fill in the details manually below.
          </p>
        )}
        <p style={{ ...sans, fontSize: 11, color: palette.slateLight, marginTop: 8 }}>
          Simulated for this prototype. A live version would call the DVLA Vehicle Enquiry Service from a secure backend, and pull real pricing from a proper valuation provider rather than this illustrative estimate.
        </p>
      </div>

      <div className="mb-5">
        <label style={labelStyle}>Photos ({images.length}/{MAX_IMAGES})</label>
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative h-20 w-28 rounded-sm overflow-hidden" style={{ border: `1px solid ${palette.line}` }}>
              <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-sm p-0.5"
                style={{ background: "rgba(27,36,48,0.75)" }}
              >
                <Trash2 size={12} color="#fff" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label
              className="h-20 w-28 rounded-sm flex flex-col items-center justify-center cursor-pointer gap-1"
              style={{ border: `1px dashed ${palette.line}`, color: palette.slateLight, ...sans, fontSize: 11 }}
            >
              <ImagePlus size={18} />
              Add photo
              <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            </label>
          )}
        </div>
        {imageError && <p style={{ ...sans, fontSize: 11.5, color: "#B4432E", marginTop: 6 }}>{imageError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label style={labelStyle}>Make</label><input style={inputStyle} value={form.make} onChange={(e) => update("make", e.target.value)} placeholder="e.g. Honda" /></div>
        <div><label style={labelStyle}>Model</label><input style={inputStyle} value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="e.g. Civic" /></div>
        <div><label style={labelStyle}>Year</label><input style={inputStyle} type="number" value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="2020" /></div>
        <div><label style={labelStyle}>Mileage</label><input style={inputStyle} type="number" value={form.mileage} onChange={(e) => update("mileage", e.target.value)} placeholder="30000" /></div>
        <div><label style={labelStyle}>Price (£)</label><input style={inputStyle} type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="12000" /></div>

        <div className="sm:col-span-2 p-3 rounded-sm" style={{ background: estimate ? palette.verifiedBg : palette.paperDim, border: `1px solid ${estimate ? `${palette.verified}33` : palette.line}` }}>
          {estimate ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span style={{ ...sans, fontSize: 13, color: palette.ink }}>
                  Suggested price: <strong>£{estimate.low.toLocaleString()}–£{estimate.high.toLocaleString()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => update("price", String(Math.round((estimate.low + estimate.high) / 2)))}
                  className="px-2.5 py-1 rounded-sm"
                  style={{ ...sans, fontSize: 11.5, fontWeight: 500, border: `1px solid ${palette.amberInk}`, color: palette.amberInk }}
                >
                  Use midpoint
                </button>
              </div>
              <p style={{ ...sans, fontSize: 11, color: palette.slate, marginTop: 6 }}>
                Based on a {form.year} registration and {Number(form.mileage).toLocaleString()} miles — edit either field above and this updates.
              </p>
            </>
          ) : (
            <p style={{ ...sans, fontSize: 11.5, color: palette.slateLight }}>
              {estimateBlockedBy === "lookup" && "Look up your registration above to get a suggested price."}
              {estimateBlockedBy === "year" && "Add the year to get a suggested price."}
              {estimateBlockedBy === "mileage" && "Add the mileage to get a suggested price — it's the biggest factor after age."}
            </p>
          )}
        </div>

        <div><label style={labelStyle}>Location</label><input style={inputStyle} value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Camden, London" /></div>
        <div>
          <label style={labelStyle}>{form.vehicleType === "Motorcycle" ? "Bike type" : "Body type"}</label>
          <select style={inputStyle} value={form.bodyType} onChange={(e) => update("bodyType", e.target.value)}>
            {BODY_TYPES_BY_VEHICLE[form.vehicleType].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fuel type</label>
          <select style={inputStyle} value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)}>
            {FUEL_TYPES_BY_VEHICLE[form.vehicleType].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Gearbox</label>
          <select style={inputStyle} value={form.gearbox} onChange={(e) => update("gearbox", e.target.value)}>
            {(form.vehicleType === "Motorcycle" ? ["Manual", "Semi-automatic", "CVT (automatic)"] : ["Manual", "Automatic"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        {form.vehicleType !== "Motorcycle" && (
          <div><label style={labelStyle}>Doors</label><input style={inputStyle} type="number" value={form.doors} onChange={(e) => update("doors", e.target.value)} /></div>
        )}
        <div><label style={labelStyle}>Seats</label><input style={inputStyle} type="number" value={form.seats} onChange={(e) => update("seats", e.target.value)} placeholder={form.vehicleType === "Motorcycle" ? "1 or 2" : undefined} /></div>
        <div><label style={labelStyle}>Colour</label><input style={inputStyle} value={form.colour} onChange={(e) => update("colour", e.target.value)} placeholder="e.g. Grey" /></div>
        <div>
          <label style={labelStyle}>Engine size {form.vehicleType === "Motorcycle" ? "(cc)" : "(L)"}</label>
          <input style={inputStyle} type="number" step={form.vehicleType === "Motorcycle" ? "1" : "0.1"} value={form.engineSize} onChange={(e) => update("engineSize", e.target.value)} placeholder={form.vehicleType === "Motorcycle" ? "e.g. 649" : "e.g. 1.6"} />
        </div>
        <div><label style={labelStyle}>CO2 (g/km)</label><input style={inputStyle} type="number" value={form.co2} onChange={(e) => update("co2", e.target.value)} placeholder="e.g. 120" /></div>

        {form.vehicleType === "Motorcycle" && (
          <div>
            <label style={labelStyle}>Licence needed</label>
            <select style={inputStyle} value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)}>
              {LICENSE_CATEGORIES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        )}

        {form.vehicleType === "Van" && (
          <>
            <div><label style={labelStyle}>Load volume (m³)</label><input style={inputStyle} type="number" step="0.1" value={form.loadVolume} onChange={(e) => update("loadVolume", e.target.value)} placeholder="e.g. 6.0" /></div>
            <div><label style={labelStyle}>Payload (kg)</label><input style={inputStyle} type="number" value={form.payload} onChange={(e) => update("payload", e.target.value)} placeholder="e.g. 1000" /></div>
          </>
        )}
      </div>

      <div className="mt-4 p-3 rounded-sm" style={{ border: `1px solid ${palette.line}` }}>
        <label style={labelStyle}>Outstanding finance (HP/PCP)?</label>
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-1.5" style={{ ...sans, fontSize: 13, color: palette.ink }}>
            <input type="radio" name="hasFinance" checked={form.hasFinance === "no"} onChange={() => update("hasFinance", "no")} />
            No, owned outright
          </label>
          <label className="flex items-center gap-1.5" style={{ ...sans, fontSize: 13, color: palette.ink }}>
            <input type="radio" name="hasFinance" checked={form.hasFinance === "yes"} onChange={() => update("hasFinance", "yes")} />
            Yes, finance outstanding
          </label>
        </div>
        <p style={{ ...sans, fontSize: 11, color: palette.slateLight, marginTop: 6 }}>
          Buyers see this upfront — it's illegal to sell a car with a lien without settling or disclosing it, so being upfront here builds trust rather than risking the deal later.
        </p>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <label style={{ ...labelStyle, marginBottom: 0 }}>Description</label>
          <button
            type="button"
            onClick={generateDescription}
            disabled={generating || !form.make || !form.model || !form.year}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
            style={{
              ...sans, fontSize: 11.5, fontWeight: 500,
              border: `1px solid ${palette.amberInk}`,
              color: palette.amberInk,
              opacity: generating || !form.make || !form.model || !form.year ? 0.5 : 1,
            }}
          >
            <Sparkles size={12} />
            {generating ? "Writing…" : "Generate with AI"}
          </button>
        </div>
        <textarea style={{ ...inputStyle, minHeight: 70 }} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder={`Tell buyers about the ${form.vehicleType.toLowerCase()}'s condition and history… or use Generate with AI once you've filled in the details above.`} />
        {genError && <p style={{ ...sans, fontSize: 11.5, color: "#B4432E", marginTop: 4 }}>{genError}</p>}
        {!form.make || !form.model || !form.year ? (
          <p style={{ ...sans, fontSize: 11, color: palette.slateLight, marginTop: 4 }}>Fill in make, model and year to enable AI generation.</p>
        ) : null}
      </div>
      <p style={{ ...sans, fontSize: 11.5, color: palette.slateLight, marginTop: 10 }}>
        MOT history, HPI status and mileage verification will run automatically once you publish — new listings show as "verification pending" until that completes.
      </p>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="px-4 py-2 rounded-sm" style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}>
          {submitLabel}
        </button>
        {!hideCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-sm" style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.slate }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function SellerDashboard({ authUser, listings, threads, onAddListing, onOpenThread }) {
  const [showForm, setShowForm] = useState(!authUser);
  const mine = authUser ? listings.filter((l) => l.ownerId === authUser.email) : [];

  // Guest flow: go straight to the form. Account creation only happens when they hit Publish.
  if (!authUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 style={{ ...serif, fontSize: 26, color: palette.ink }}>List your vehicle</h2>
          <p style={{ ...sans, fontSize: 13, color: palette.slate, marginTop: 4 }}>
            Fill in the details below — we'll only ask you to create an account or log in right at the end, before your listing goes live.
          </p>
        </div>
        <AddListingForm submitLabel="Continue" onSubmit={onAddListing} onCancel={() => {}} hideCancel />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 style={{ ...serif, fontSize: 26, color: palette.ink }}>Your listings</h2>
          <p style={{ ...sans, fontSize: 13, color: palette.slate, marginTop: 4 }}>Manage what you're selling and see who's messaged you.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-sm"
            style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.ink, color: "#fff" }}
          >
            + List a car
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <AddListingForm
            onCancel={() => setShowForm(false)}
            onSubmit={(form) => {
              onAddListing(form);
              setShowForm(false);
            }}
          />
        </div>
      )}

      {mine.length === 0 ? (
        <p style={{ ...sans, fontSize: 13.5, color: palette.slateLight }}>You haven't listed a car yet.</p>
      ) : (
        <div className="space-y-3">
          {mine.map((l) => {
            const thread = threads[l.id];
            return (
              <div key={l.id} className="rounded-sm p-4 flex items-center justify-between flex-wrap gap-3" style={{ border: `1px solid ${palette.line}`, background: "#fff" }}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-16 rounded-sm flex-shrink-0 overflow-hidden flex items-center justify-center px-1" style={{ background: l.color }}>
                    {l.images?.length > 0
                      ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                      : <VehicleArt type={l.vehicleType} accent="#FFFFFF" seed={l.id} />}
                  </div>
                  <div>
                    <p style={{ ...sans, fontWeight: 600, fontSize: 14, color: palette.ink }}>{l.year} {l.make} {l.model}</p>
                    <p style={{ ...sans, fontSize: 12.5, color: palette.slate }}>£{l.price.toLocaleString()} · {l.mileage.toLocaleString()} mi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {l.trust?.motVerified ? (
                    <TrustBadge ok label="Verified" icon={ShieldCheck} />
                  ) : (
                    <TrustBadge ok={false} label="Verification pending" icon={AlertTriangle} />
                  )}
                  {thread ? (
                    <button
                      onClick={() => onOpenThread(l.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
                      style={{ ...sans, fontSize: 12.5, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.ink }}
                    >
                      <MessageCircle size={13} /> {thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}
                    </button>
                  ) : (
                    <span style={{ ...sans, fontSize: 12, color: palette.slateLight }}>No enquiries yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Main App ----------

function WelcomePage({ onBuy, onSell, listingCount }) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center py-10">
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <span className="flex gap-1">
            <span style={{ width: 14, height: 14, background: palette.amber, border: `2px solid ${palette.lineBold}`, borderRadius: 3 }} />
            <span style={{ width: 14, height: 14, background: palette.turquoise, border: `2px solid ${palette.lineBold}`, borderRadius: 3 }} />
            <span style={{ width: 14, height: 14, background: palette.pink, border: `2px solid ${palette.lineBold}`, borderRadius: 3 }} />
          </span>
          <span style={{ ...serif, fontSize: 30, color: palette.ink }}>Odo Veritas</span>
        </div>
        <h1 style={{ ...serif, fontSize: 52, color: palette.ink, lineHeight: 1.0, maxWidth: 640, margin: "0 auto" }}>
          Sell like a pro,<br />buy peacefully.
        </h1>
        <p style={{ ...sans, fontSize: 17, fontWeight: 400, color: palette.slate, letterSpacing: "0.01em", marginTop: 14 }}>
          Veritas on every vehicle.
        </p>
        <p style={{ ...sans, fontSize: 15.5, color: palette.slate, lineHeight: 1.6, maxWidth: 560, margin: "14px auto 0" }}>
          Cars, motorcycles and vans direct from private sellers — every listing checked against official MOT and registration records before a buyer ever sees it.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <button
            onClick={onBuy}
            className="flex items-center gap-2 px-6 py-3 rounded-sm"
            style={{ ...sans, fontSize: 14.5, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
          >
            Buy a car <ArrowRight size={16} />
          </button>
          <button
            onClick={onSell}
            className="flex items-center gap-2 px-6 py-3 rounded-sm"
            style={{ ...sans, fontSize: 14.5, fontWeight: 500, background: palette.pink, color: palette.pinkInk, border: `1.5px solid ${palette.pinkInk}` }}
          >
            Sell a car <ArrowRight size={16} />
          </button>
        </div>
        <p style={{ ...sans, fontSize: 12, color: palette.slateLight, marginTop: 14 }}>
          {listingCount} verified {listingCount === 1 ? "vehicle" : "vehicles"} listed · Free to browse · No dealer fees
        </p>
      </section>

      {/* Mission */}
      <section className="py-10" style={{ borderTop: `1px solid ${palette.line}` }}>
        <h2 style={{ ...serif, fontSize: 24, color: palette.ink, textAlign: "center", marginBottom: 8 }}>
          Why we built this
        </h2>
        <p style={{ ...sans, fontSize: 14, color: palette.slate, textAlign: "center", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Private car sales are cheaper for everyone — but buyers can't verify what they're told, and honest sellers get lumped in with the dishonest ones. We fix that with data, not promises.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MISSION_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="p-5 rounded-sm" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                <Icon size={20} style={{ color: palette.verified }} />
                <h3 style={{ ...sans, fontSize: 14, fontWeight: 600, color: palette.ink, marginTop: 10 }}>{point.title}</h3>
                <p style={{ ...sans, fontSize: 12.5, color: palette.slate, marginTop: 6, lineHeight: 1.55 }}>{point.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reviews */}
      <section className="py-10" style={{ borderTop: `1px solid ${palette.line}` }}>
        <h2 style={{ ...serif, fontSize: 24, color: palette.ink, textAlign: "center", marginBottom: 24 }}>
          What people say
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {REVIEWS.map((review) => (
            <div key={review.name} className="p-5 rounded-sm" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={13}
                    style={{ color: i < review.rating ? palette.amber : palette.line }}
                    fill={i < review.rating ? palette.amber : "none"}
                  />
                ))}
              </div>
              <p style={{ ...sans, fontSize: 13, color: palette.ink, lineHeight: 1.6 }}>{review.text}</p>
              <p style={{ ...sans, fontSize: 12, color: palette.slateLight, marginTop: 10 }}>
                {review.name} · {review.location}
              </p>
            </div>
          ))}
        </div>
        <p style={{ ...sans, fontSize: 10.5, color: palette.slateLight, textAlign: "center", marginTop: 14 }}>
          Illustrative examples for this prototype — not real customer reviews.
        </p>
      </section>

      {/* Partners */}
      <section className="py-10" style={{ borderTop: `1px solid ${palette.line}` }}>
        <h2 style={{ ...serif, fontSize: 24, color: palette.ink, textAlign: "center", marginBottom: 6 }}>
          Where our data comes from
        </h2>
        <p style={{ ...sans, fontSize: 13.5, color: palette.slate, textAlign: "center", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.6 }}>
          We don't ask you to trust us — we show you the source.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PARTNERS.map((partner) => (
            <div key={partner.name} className="p-4 rounded-sm text-center" style={{ background: palette.paperDim, border: `1px solid ${palette.line}` }}>
              <p style={{ ...serif, fontSize: 17, color: palette.ink }}>{partner.name}</p>
              <p style={{ ...sans, fontSize: 11.5, color: palette.slate, marginTop: 4 }}>{partner.role}</p>
            </div>
          ))}
        </div>
        <p style={{ ...sans, fontSize: 10.5, color: palette.slateLight, textAlign: "center", marginTop: 14 }}>
          Intended integrations for this prototype — these partnerships are not yet in place.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="py-10 text-center" style={{ borderTop: `1px solid ${palette.line}` }}>
        <h2 style={{ ...serif, fontSize: 22, color: palette.ink }}>Ready to start?</h2>
        <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
          <button
            onClick={onBuy}
            className="px-5 py-2.5 rounded-sm"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}` }}
          >
            Browse vehicles
          </button>
          <button
            onClick={onSell}
            className="px-5 py-2.5 rounded-sm"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, background: palette.pink, color: palette.pinkInk, border: `1.5px solid ${palette.pinkInk}` }}
          >
            List your vehicle
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("welcome"); // welcome | browse | detail | sell | messages
  const [selected, setSelected] = useState(null);
  const resultsRef = useRef(null);
  const [category, setCategory] = useState("Car"); // Car | Motorcycle | Van — each nav entry is its own section
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [postcodeInput, setPostcodeInput] = useState("");
  const [postcodeStatus, setPostcodeStatus] = useState("idle"); // idle | loading | found | error
  const [radiusMiles, setRadiusMiles] = useState("");
  const [selectedFuelTypes, setSelectedFuelTypes] = useState([]);
  const [selectedGearboxes, setSelectedGearboxes] = useState([]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState([]);
  const [selectedRangeBuckets, setSelectedRangeBuckets] = useState([]);
  const [selectedYearBuckets, setSelectedYearBuckets] = useState([]);
  const [selectedMileageBuckets, setSelectedMileageBuckets] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [savedIds, setSavedIds] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(20000);
  const [onlyVerifiedClean, setOnlyVerifiedClean] = useState(false);
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState(1);
  const [authUser, setAuthUser] = useState(null);
  const [users, setUsers] = useState(DEMO_USERS);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // action to run once logged in
  const [loginContext, setLoginContext] = useState("");
  const [loginInitialMode, setLoginInitialMode] = useState("login");

  const [listings, setListings] = useState(INITIAL_LISTINGS);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported in this browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    setPostcodeStatus("idle");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enable it in your browser settings to sort by distance."
            : "Couldn't get your location. Try again."
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  // Real, no-key-required lookup via postcodes.io (a free public UK postcode API) —
  // unlike the DVLA/DVSA integrations elsewhere in this prototype, this one genuinely works as-is.
  // Accepts either a UK postcode ("SW1A 1AA", "W3 8AN") or a town/city name
  // ("Manchester", "Bristol"). Tries postcodes.io first, then falls back to a
  // local lookup table so distance filtering still works if the network call
  // is blocked (as it is in some sandboxed preview environments).
  async function lookupPostcode() {
    const input = postcodeInput.trim();
    if (!input) return;
    setPostcodeStatus("loading");
    setLocationError("");

    // UK postcode shape: 1-2 letters, digit(s), optional letter, optional space,
    // then digit + 2 letters. Also matches an outward-code-only entry like "W3".
    const looksLikePostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s*(\d[A-Z]{2})?$/i.test(input);

    function tryLocalFallback() {
      const key = input.toUpperCase().replace(/\s+/g, "");
      if (looksLikePostcode) {
        // Try progressively shorter outward codes: "W38AN" -> "W3A" -> "W3".
        for (let len = Math.min(4, key.length); len >= 2; len--) {
          const hit = LOCAL_OUTCODES[key.slice(0, len)];
          if (hit) {
            setUserLocation({ lat: hit.lat, lng: hit.lng });
            setPostcodeStatus("found");
            return true;
          }
        }
      }
      const place = LOCAL_PLACES[input.toUpperCase().trim()];
      if (place) {
        setUserLocation({ lat: place.lat, lng: place.lng });
        setPostcodeInput(input.charAt(0).toUpperCase() + input.slice(1).toLowerCase());
        setPostcodeStatus("found");
        return true;
      }
      return false;
    }

    try {
      if (looksLikePostcode) {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(input)}`);
        const data = await res.json();
        if (res.ok && data.result) {
          setUserLocation({ lat: data.result.latitude, lng: data.result.longitude });
          setPostcodeInput(data.result.postcode);
          setPostcodeStatus("found");
          return;
        }
        const outRes = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(input.replace(/\s+/g, ""))}`);
        const outData = await outRes.json();
        if (outRes.ok && outData.result) {
          setUserLocation({ lat: outData.result.latitude, lng: outData.result.longitude });
          setPostcodeInput(outData.result.outcode);
          setPostcodeStatus("found");
          return;
        }
      } else {
        const placeRes = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(input)}&limit=1`);
        const placeData = await placeRes.json();
        if (placeRes.ok && placeData.result?.length > 0) {
          const place = placeData.result[0];
          setUserLocation({ lat: place.latitude, lng: place.longitude });
          setPostcodeInput(place.name_1);
          setPostcodeStatus("found");
          return;
        }
      }

      if (tryLocalFallback()) return;
      setPostcodeStatus("error");
      setLocationError(`Couldn't find "${input}" — try a UK postcode or town name.`);
    } catch (err) {
      // Network blocked or offline — fall back to the local table.
      if (tryLocalFallback()) return;
      setPostcodeStatus("error");
      setLocationError(`Couldn't look up "${input}" (offline). Try a major UK city or use "Use my location".`);
    }
  }

  function toggleInArray(setArr, value) {
    setArr((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function toggleSaved(id) {
    toggleInArray(setSavedIds, id);
  }

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      // Cap at 4 — beyond that the table stops being readable and starts
      // needing horizontal scrolling on almost any screen.
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const compareListings = useMemo(
    () => compareIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean),
    [compareIds, listings]
  );

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Reset make/model and checkbox filters when switching sections — a selected
  // "Estate" body type or "Diesel" fuel filter from Cars shouldn't silently
  // carry over and hide everything when you switch to Motorcycles.
  useEffect(() => {
    setSelectedMake("");
    setSelectedModel("");
    setSelectedFuelTypes([]);
    setSelectedGearboxes([]);
    setSelectedBodyTypes([]);
    setSelectedRangeBuckets([]);
    setSelectedYearBuckets([]);
    setSelectedMileageBuckets([]);
  }, [category]);

  useEffect(() => {
    setSelectedModel("");
  }, [selectedMake]);

  // Distance (miles) from the user to each listing, keyed by listing id.
  const distances = useMemo(() => {
    if (!userLocation) return {};
    const map = {};
    listings.forEach((l) => {
      map[l.id] = distanceMiles(userLocation.lat, userLocation.lng, l.lat, l.lng);
    });
    return map;
  }, [userLocation, listings]);

  const categoryListings = useMemo(
    () => listings.filter((l) => l.vehicleType === category),
    [listings, category]
  );
  const makeOptions = useMemo(
    () => Array.from(new Set(categoryListings.map((l) => l.make))).sort(),
    [categoryListings]
  );
  const modelOptions = useMemo(() => {
    const pool = selectedMake ? categoryListings.filter((l) => l.make === selectedMake) : categoryListings;
    return Array.from(new Set(pool.map((l) => l.model))).sort();
  }, [categoryListings, selectedMake]);

  const fuelTypeOptions = FUEL_TYPES_BY_VEHICLE[category].map((f) => ({ value: f, label: f }));
  const gearboxOptions = useMemo(
    () => Array.from(new Set(categoryListings.map((l) => l.spec.gearbox))).sort().map((g) => ({ value: g, label: g })),
    [categoryListings]
  );
  const bodyTypeOptions = BODY_TYPES_BY_VEHICLE[category].map((b) => ({ value: b, label: b }));
  const rangeFilter = RANGE_FILTERS[category];
  const rangeBucketOptions = rangeFilter.buckets.map((b) => ({ value: b.id, label: b.label }));

  const activeFilterCount =
    selectedFuelTypes.length + selectedGearboxes.length + selectedBodyTypes.length +
    selectedRangeBuckets.length + selectedYearBuckets.length + selectedMileageBuckets.length;

  const filtered = useMemo(() => {
    let list = listings.filter((l) => {
      const matchesCategory = l.vehicleType === category;
      const matchesMake = !selectedMake || l.make === selectedMake;
      const matchesModel = !selectedModel || l.model === selectedModel;
      const matchesPrice = l.price <= maxPrice;
      const matchesTrust = !onlyVerifiedClean || (l.trust.hpiClear && l.trust.accidentFree);
      const matchesFuel = selectedFuelTypes.length === 0 || selectedFuelTypes.includes(l.spec.fuelType);
      const matchesGearbox = selectedGearboxes.length === 0 || selectedGearboxes.includes(l.spec.gearbox);
      const matchesBodyType = selectedBodyTypes.length === 0 || selectedBodyTypes.includes(l.spec.bodyType);
      const matchesRange =
        selectedRangeBuckets.length === 0 ||
        selectedRangeBuckets.some((bucketId) => {
          const bucket = RANGE_FILTERS[l.vehicleType]?.buckets.find((b) => b.id === bucketId);
          return bucket ? bucket.test(RANGE_FILTERS[l.vehicleType].getValue(l)) : false;
        });
      const matchesYear =
        selectedYearBuckets.length === 0 ||
        selectedYearBuckets.some((bucketId) => YEAR_BUCKETS.find((b) => b.id === bucketId)?.test(l.year));
      const matchesMileage =
        selectedMileageBuckets.length === 0 ||
        selectedMileageBuckets.some((bucketId) => MILEAGE_BUCKETS.find((b) => b.id === bucketId)?.test(l.mileage));
      const matchesRadius =
        !userLocation || !radiusMiles || (distances[l.id] != null && distances[l.id] <= Number(radiusMiles));
      return (
        matchesCategory && matchesMake && matchesModel && matchesPrice && matchesTrust &&
        matchesFuel && matchesGearbox && matchesBodyType && matchesRange && matchesYear &&
        matchesMileage && matchesRadius
      );
    });

    if (sortKey) {
      const field = SORT_FIELDS.find((f) => f.key === sortKey);
      if (field) {
        list = [...list].sort((a, b) => {
          const va = field.get(a, distances);
          const vb = field.get(b, distances);
          // Push missing values (e.g. no battery range on a petrol car) to the end regardless of direction.
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          const cmp = field.type === "string"
            ? String(va).localeCompare(String(vb))
            : va - vb;
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }

    return list;
  }, [
    category, selectedMake, selectedModel, maxPrice, onlyVerifiedClean,
    selectedFuelTypes, selectedGearboxes, selectedBodyTypes, selectedRangeBuckets, selectedYearBuckets, selectedMileageBuckets,
    userLocation, radiusMiles, sortKey, sortDir, distances, listings,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [
    category, selectedMake, selectedModel, maxPrice, onlyVerifiedClean,
    selectedFuelTypes, selectedGearboxes, selectedBodyTypes, selectedRangeBuckets, selectedYearBuckets, selectedMileageBuckets,
    radiusMiles, sortKey, sortDir,
  ]);

  // Guard against landing on a page that no longer exists (e.g. results shrank).
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openListing(l) {
    setSelected(l);
    setView("detail");
  }

  function requireLogin(action, { context = "", mode = "login" } = {}) {
    setPendingAction(() => action);
    setLoginContext(context);
    setLoginInitialMode(mode);
    setShowLogin(true);
  }

  function doMessageSeller(l, user) {
    setThreads((prev) => ({
      ...prev,
      [l.id]: prev[l.id] || {
        ...emptyThread(),
        messages: [
          { from: "them", text: `Hi, thanks for your interest in the ${l.make} ${l.model}!`, time: "now" },
        ],
      },
    }));
    setActiveThreadId(l.id);
    setView("messages");
  }

  function messageSeller(l) {
    if (!authUser) {
      requireLogin((user) => doMessageSeller(l, user));
      return;
    }
    doMessageSeller(l, authUser);
  }

  function doBookInspection(l, booking, user) {
    const dateLabel = new Date(`${booking.date}T${booking.time}`).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
    const isProfessional = booking.type === "professional";
    const price = ADD_ONS.find((a) => a.id === "inspection")?.price ?? 129;
    const summary = isProfessional
      ? `📅 Professional inspection requested — ${dateLabel}. A partner inspector will attend; quoted at £${price.toFixed(2).replace(/\.00$/, "")}, nothing charged yet.`
      : `📅 In-person inspection requested — ${dateLabel}. I'd like to come and view the car myself.`;
    const fullText = booking.message ? `${summary}\n\n"${booking.message}"` : summary;

    setThreads((prev) => {
      const existing = prev[l.id] || emptyThread();
      return {
        ...prev,
        [l.id]: { ...existing, messages: [...existing.messages, { from: "me", text: fullText, time: "now" }] },
      };
    });
    setActiveThreadId(l.id);
    setView("messages");
  }

  function bookInspection(l, booking) {
    if (!authUser) {
      requireLogin((user) => doBookInspection(l, booking, user));
      return;
    }
    doBookInspection(l, booking, authUser);
  }

  function doMakeOffer(l, offer, user) {
    const summary = `💰 Offer: £${offer.amount.toLocaleString()} (asking £${l.price.toLocaleString()})`;
    const fullText = offer.message ? `${summary}\n\n"${offer.message}"` : summary;

    setThreads((prev) => {
      const existing = prev[l.id] || emptyThread();
      return {
        ...prev,
        [l.id]: {
          ...existing,
          offer: { amount: offer.amount, status: "pending" },
          messages: [...existing.messages, { from: "me", text: fullText, time: "now" }],
        },
      };
    });
    setActiveThreadId(l.id);
    setView("messages");
  }

  function makeOffer(l, offer) {
    if (!authUser) {
      requireLogin((user) => doMakeOffer(l, offer, user));
      return;
    }
    doMakeOffer(l, offer, authUser);
  }

  function respondToOffer(id, status) {
    setThreads((prev) => {
      const existing = prev[id];
      if (!existing?.offer) return prev;
      const label = status === "accepted" ? "✓ Offer accepted" : "Offer declined";
      const text = `${label} — £${existing.offer.amount.toLocaleString()}`;
      return {
        ...prev,
        [id]: {
          ...existing,
          offer: { ...existing.offer, status },
          messages: [...existing.messages, { from: "them", text, time: "now" }],
        },
      };
    });
  }

  function sendMessage(id, text) {
    setThreads((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        messages: [...(prev[id]?.messages || []), { from: "me", text, time: "now" }],
      },
    }));
  }

  function setDealStatus(id, status) {
    setThreads((prev) => ({
      ...prev,
      [id]: { ...prev[id], dealStatus: status },
    }));
  }

  function toggleAddOn(id, addOnId) {
    setThreads((prev) => {
      const current = prev[id]?.addOns || [];
      const next = current.includes(addOnId)
        ? current.filter((a) => a !== addOnId)
        : [...current, addOnId];
      return { ...prev, [id]: { ...prev[id], addOns: next } };
    });
  }

  function handleLogin(user) {
    setAuthUser(user);
    setShowLogin(false);
    setLoginContext("");
    setLoginInitialMode("login");
    if (pendingAction) {
      pendingAction(user);
      setPendingAction(null);
    }
  }

  function handleSignup({ name, email, password }) {
    const newUser = { name, email, password, role: "seller" };
    setUsers((prev) => [...prev, newUser]);
    handleLogin(newUser);
  }

  function handleLogout() {
    setAuthUser(null);
    setView("welcome");
  }

  function handlePublishAttempt(form) {
    if (!authUser) {
      requireLogin((user) => addListing(form, user), {
        context: "Almost done — create an account or log in to publish your listing.",
        mode: "signup",
      });
      return;
    }
    addListing(form, authUser);
  }

  function addListing(form, user) {
    const newListing = {
      id: Math.max(0, ...listings.map((l) => l.id)) + 1,
      vehicleType: form.vehicleType || "Car",
      make: form.make,
      model: form.model,
      year: Number(form.year),
      price: Number(form.price) || 0,
      mileage: Number(form.mileage) || 0,
      location: form.location || "Not specified",
      lat: userLocation?.lat ?? 51.5072,
      lng: userLocation?.lng ?? -0.1276,
      color: palette.slate,
      images: form.images || [],
      registration: form.registration || "",
      financeDeclared: form.hasFinance === "yes",
      ownerId: user.email,
      seller: { name: user.name, memberSince: new Date().getFullYear(), responseTime: "New seller", verified: false, ownerCount: 1 },
      trust: { motVerified: false, mileageVerified: false, hpiClear: false, accidentFree: true },
      motHistory: [],
      description: form.description || "",
      spec: {
        bodyType: form.bodyType,
        doors: form.vehicleType === "Motorcycle" ? null : Number(form.doors) || 5,
        bootSpace: null,
        gearbox: form.gearbox,
        colour: form.colour || null,
        seats: Number(form.seats) || (form.vehicleType === "Motorcycle" ? 2 : 5),
        isofix: null,
        fuelType: form.fuelType,
        engineSize: form.engineSize !== "" ? Number(form.engineSize) : null,
        power: null,
        co2: form.co2 !== "" ? Number(form.co2) : null,
        batteryRange: null,
        chargingTime: null,
        licenseCategory: form.vehicleType === "Motorcycle" ? form.licenseCategory : null,
        loadVolume: form.vehicleType === "Van" && form.loadVolume !== "" ? Number(form.loadVolume) : null,
        payload: form.vehicleType === "Van" && form.payload !== "" ? Number(form.payload) : null,
      },
    };
    setListings((prev) => [newListing, ...prev]);
  }

  function openThreadForListing(listingId) {
    setActiveThreadId(listingId);
    setView("messages");
  }

  return (
    <div style={{ background: palette.paper, minHeight: "100vh" }}>
      <style>{FONT_IMPORT}</style>

      <header className="px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: `3px solid ${palette.turquoise}` }}>
        <button onClick={() => setView("welcome")} className="flex items-center gap-2">
          <span className="flex gap-0.5">
            <span style={{ width: 10, height: 10, background: palette.amber, border: `1.5px solid ${palette.lineBold}`, borderRadius: 2 }} />
            <span style={{ width: 10, height: 10, background: palette.turquoise, border: `1.5px solid ${palette.lineBold}`, borderRadius: 2 }} />
            <span style={{ width: 10, height: 10, background: palette.pink, border: `1.5px solid ${palette.lineBold}`, borderRadius: 2 }} />
          </span>
          <span style={{ ...serif, fontSize: 20, color: palette.ink }}>Odo Veritas</span>
        </button>
        <nav className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setCategory("Car"); setView("browse"); }}
            className="px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: view === "browse" && category === "Car" ? "#fff" : palette.ink, background: view === "browse" && category === "Car" ? palette.ink : "transparent" }}
          >
            Cars
          </button>
          <button
            onClick={() => { setCategory("Motorcycle"); setView("browse"); }}
            className="px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: view === "browse" && category === "Motorcycle" ? "#fff" : palette.ink, background: view === "browse" && category === "Motorcycle" ? palette.ink : "transparent" }}
          >
            Motorcycles
          </button>
          <button
            onClick={() => { setCategory("Van"); setView("browse"); }}
            className="px-3 py-1.5 rounded-sm"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: view === "browse" && category === "Van" ? "#fff" : palette.ink, background: view === "browse" && category === "Van" ? palette.ink : "transparent" }}
          >
            Vans
          </button>
          <button
            onClick={() => {
              if (!authUser) {
                requireLogin(() => setView("messages"));
                return;
              }
              setView("messages");
            }}
            className="px-3 py-1.5 rounded-sm flex items-center gap-1.5"
            style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: view === "messages" ? "#fff" : palette.ink, background: view === "messages" ? palette.ink : "transparent" }}
          >
            {!authUser && <Lock size={12} />}
            Messages
          </button>

          <div className="w-px h-5 mx-1" style={{ background: palette.line }} />

          {authUser ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5" style={{ ...sans, fontSize: 13, color: palette.ink }}>
                <User size={14} /> {authUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
                style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.slate }}
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => requireLogin(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
              style={{ ...sans, fontSize: 13, fontWeight: 500, background: palette.ink, color: "#fff" }}
            >
              <LogIn size={14} /> Log in
            </button>
          )}
        </nav>
      </header>

      {showLogin && (
        <LoginModal
          onClose={() => {
            setShowLogin(false);
            setPendingAction(null);
            setLoginContext("");
            setLoginInitialMode("login");
          }}
          onLogin={handleLogin}
          onSignup={handleSignup}
          users={users}
          contextMessage={loginContext}
          initialMode={loginInitialMode}
        />
      )}

      <main className="px-6 py-8" style={{ paddingBottom: compareIds.length > 0 && view !== "compare" ? 88 : undefined }}>
        {view === "compare" && (
          <CompareView
            listings={compareListings}
            onBack={() => setView("browse")}
            onOpen={openListing}
            onRemove={toggleCompare}
            onClearAll={() => { setCompareIds([]); setView("browse"); }}
          />
        )}

        {view === "welcome" && (
          <WelcomePage
            listingCount={listings.length}
            onBuy={() => setView("browse")}
            onSell={() => setView("sell")}
          />
        )}

        {view === "browse" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 max-w-xl">
              <h1 style={{ ...serif, fontSize: 32, color: palette.ink, lineHeight: 1.15 }}>
                {{ Car: "Buy a car", Motorcycle: "Buy a motorcycle", Van: "Buy a van" }[category]}, backed by the record.
              </h1>
              <p style={{ ...sans, fontSize: 14.5, color: palette.slate, marginTop: 10, lineHeight: 1.6 }}>
                {{
                  Car: "Every listing here is checked against MOT history and vehicle records before it goes live, so you're never just taking a stranger's word for it.",
                  Motorcycle: "Every bike here is checked against MOT history and vehicle records before it goes live — engine size, licence category and all.",
                  Van: "Every van here is checked against MOT history and vehicle records before it goes live, with load volume and payload listed upfront.",
                }[category]}
              </p>
            </div>

            {/* Unified search bar: postcode, make, model, filter toggle, live-count CTA */}
            <div
              className="flex flex-wrap items-stretch mb-4 rounded-sm overflow-hidden"
              style={{ border: `2px solid ${palette.turquoise}`, background: "#fff", borderRadius: 12 }}
            >
              <div className="flex-1 min-w-[130px] px-4 py-2.5" style={{ borderRight: `1px solid ${palette.line}` }}>
                <label style={{ ...sans, fontSize: 11, fontWeight: 600, color: palette.ink, display: "block" }}>Postcode or town</label>
                <input
                  value={postcodeInput}
                  onChange={(e) => { setPostcodeInput(e.target.value); setPostcodeStatus("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") lookupPostcode(); }}
                  onBlur={() => { if (postcodeInput.trim() && postcodeStatus === "idle") lookupPostcode(); }}
                  placeholder={postcodeStatus === "loading" ? "Searching…" : "Any"}
                  className="outline-none w-full mt-0.5"
                  style={{ ...sans, fontSize: 14, color: palette.ink, background: "transparent" }}
                />
              </div>

              <div className="flex-1 min-w-[110px] px-4 py-2.5" style={{ borderRight: `1px solid ${palette.line}` }}>
                <label style={{ ...sans, fontSize: 11, fontWeight: 600, color: palette.ink, display: "block" }}>Make</label>
                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  className="outline-none w-full mt-0.5"
                  style={{ ...sans, fontSize: 14, color: selectedMake ? palette.ink : palette.slateLight, background: "transparent" }}
                >
                  <option value="">Any</option>
                  {makeOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-[110px] px-4 py-2.5" style={{ borderRight: `1px solid ${palette.line}` }}>
                <label style={{ ...sans, fontSize: 11, fontWeight: 600, color: palette.ink, display: "block" }}>Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="outline-none w-full mt-0.5"
                  style={{ ...sans, fontSize: 14, color: selectedModel ? palette.ink : palette.slateLight, background: "transparent" }}
                >
                  <option value="">Any</option>
                  {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <button
                onClick={() => setShowFilters((s) => !s)}
                title="More filters"
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 52, margin: 8, borderRadius: "9999px",
                  border: `1.5px solid ${activeFilterCount > 0 ? palette.amber : palette.line}`,
                  color: activeFilterCount > 0 ? palette.amber : palette.ink,
                  position: "relative",
                }}
              >
                <SlidersHorizontal size={17} />
                {activeFilterCount > 0 && (
                  <span
                    className="flex items-center justify-center"
                    style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "9999px", background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}`, fontSize: 9, fontWeight: 700, ...sans }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (postcodeInput.trim() && postcodeStatus !== "loading") lookupPostcode();
                  resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center justify-center gap-2 flex-shrink-0 px-6"
                style={{ background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}`, ...sans, fontSize: 14, fontWeight: 600, minWidth: 200 }}
              >
                <Search size={16} />
                Search {filtered.length.toLocaleString()} {{ Car: "cars", Motorcycle: "motorcycles", Van: "vans" }[category]}
              </button>
            </div>

            {locationError && (
              <p style={{ ...sans, fontSize: 12, color: "#B4432E", marginBottom: 12 }}>{locationError}</p>
            )}

            <div className="flex items-center flex-wrap gap-2 mb-4 px-3 py-2 rounded-sm" style={{ background: userLocation ? palette.verifiedBg : palette.paperDim, border: `1px solid ${userLocation ? `${palette.verified}33` : palette.line}` }}>
              <MapPin size={14} style={{ color: userLocation ? palette.verified : palette.slateLight }} />
              <span style={{ ...sans, fontSize: 12.5, color: userLocation ? palette.verified : palette.slate }}>
                {userLocation
                  ? (postcodeStatus === "found" && postcodeInput.trim()
                      ? `Searching around ${postcodeInput.trim()}`
                      : "Searching around your location")
                  : "Set a location to filter by distance"}
              </span>
              <span style={{ ...sans, fontSize: 12.5, color: palette.slate, marginLeft: 6 }}>Within</span>
              <select
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(e.target.value)}
                className="px-2.5 py-1 rounded-sm outline-none"
                style={{ ...sans, fontSize: 12.5, fontWeight: 500, color: palette.ink, border: `1px solid ${palette.line}`, background: "#fff" }}
              >
                <option value="">Any distance</option>
                {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} miles</option>)}
              </select>
              {!userLocation ? (
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
                  style={{ ...sans, fontSize: 11.5, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.ink, background: "#fff" }}
                >
                  <Navigation size={11} />
                  {locating ? "Locating\u2026" : "Use my location"}
                </button>
              ) : (
                <button
                  onClick={() => { setUserLocation(null); setRadiusMiles(""); setPostcodeInput(""); setPostcodeStatus("idle"); }}
                  className="flex items-center gap-1 ml-auto"
                  style={{ ...sans, fontSize: 11.5, color: palette.slate }}
                >
                  <X size={12} /> Clear location
                </button>
              )}
            </div>

            <div ref={resultsRef} />

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <aside
                className={`${showFilters ? "block" : "hidden"} sm:block rounded-sm p-3`}
                style={{ border: `2px solid ${palette.pink}`, borderRadius: 12, background: "#fff", width: 200, maxWidth: "100%", flexShrink: 0 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 style={{ ...serif, fontSize: 19, color: palette.ink }}>Filters</h2>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedFuelTypes([]); setSelectedGearboxes([]); setSelectedBodyTypes([]);
                        setSelectedRangeBuckets([]); setSelectedYearBuckets([]); setSelectedMileageBuckets([]);
                      }}
                      style={{ ...sans, fontSize: 12, fontWeight: 500, color: palette.amberInk }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <FilterSection icon={Navigation} label="Distance" sectionKey="distance" openSections={openSections} onToggle={toggleSection}>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={useMyLocation}
                      disabled={locating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm self-start"
                      style={{
                        ...sans, fontSize: 12, fontWeight: 500,
                        border: `1px solid ${palette.line}`,
                        color: userLocation ? palette.verified : palette.ink,
                        background: userLocation ? palette.verifiedBg : "#fff",
                      }}
                    >
                      <Navigation size={12} />
                      {locating ? "Locating…" : userLocation ? "Location set" : "Use my location"}
                    </button>
                    <p style={{ ...sans, fontSize: 11, color: palette.slateLight }}>
                      {userLocation
                        ? "Set your search radius in the bar above the results."
                        : "Or enter a postcode in the search bar above."}
                    </p>
                  </div>
                </FilterSection>

                <FilterSection icon={PoundSterling} label="Price" sectionKey="price" openSections={openSections} onToggle={toggleSection}>
                  <div className="flex items-center gap-2" style={{ ...sans, fontSize: 12.5, color: palette.slate }}>
                    <span style={{ minWidth: 70 }}>Up to £{maxPrice.toLocaleString()}</span>
                    <input
                      type="range"
                      min={5000}
                      max={20000}
                      step={500}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                </FilterSection>

                <FilterSection icon={Calendar} label="Age" sectionKey="age" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup
                    options={YEAR_BUCKETS.map((b) => ({ value: b.id, label: b.label }))}
                    selected={selectedYearBuckets}
                    onToggle={(v) => toggleInArray(setSelectedYearBuckets, v)}
                    vertical
                  />
                </FilterSection>

                <FilterSection icon={Gauge} label="Mileage" sectionKey="mileage" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup
                    options={MILEAGE_BUCKETS.map((b) => ({ value: b.id, label: b.label }))}
                    selected={selectedMileageBuckets}
                    onToggle={(v) => toggleInArray(setSelectedMileageBuckets, v)}
                    vertical
                  />
                </FilterSection>

                <FilterSection icon={Fuel} label="Fuel type" sectionKey="fuel" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup options={fuelTypeOptions} selected={selectedFuelTypes} onToggle={(v) => toggleInArray(setSelectedFuelTypes, v)} vertical />
                </FilterSection>

                <FilterSection icon={Settings2} label="Gearbox" sectionKey="gearbox" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup options={gearboxOptions} selected={selectedGearboxes} onToggle={(v) => toggleInArray(setSelectedGearboxes, v)} vertical />
                </FilterSection>

                <FilterSection icon={Car} label={category === "Motorcycle" ? "Bike type" : "Body type"} sectionKey="bodyType" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup options={bodyTypeOptions} selected={selectedBodyTypes} onToggle={(v) => toggleInArray(setSelectedBodyTypes, v)} vertical />
                </FilterSection>

                <FilterSection icon={Ruler} label={rangeFilter.label} sectionKey="rangeFilter" openSections={openSections} onToggle={toggleSection}>
                  <CheckboxGroup options={rangeBucketOptions} selected={selectedRangeBuckets} onToggle={(v) => toggleInArray(setSelectedRangeBuckets, v)} vertical />
                </FilterSection>

                <FilterSection icon={ArrowUpDown} label="Sort by" sectionKey="sort" openSections={openSections} onToggle={toggleSection}>
                  <div className="flex flex-col gap-2">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="px-3 py-1.5 rounded-sm outline-none"
                      style={{ ...sans, fontSize: 12.5, color: palette.ink, border: `1px solid ${palette.line}`, background: "#fff" }}
                    >
                      <option value="">Default</option>
                      {SORT_FIELDS.map((f) => (
                        <option key={f.key} value={f.key} disabled={f.needsLocation && !userLocation}>
                          {f.label}{f.needsLocation && !userLocation ? " (set location first)" : ""}
                        </option>
                      ))}
                    </select>
                    {sortKey && (
                      <button
                        onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                        className="px-3 py-1.5 rounded-sm self-start"
                        style={{ ...sans, fontSize: 12.5, fontWeight: 500, border: `1px solid ${palette.line}`, color: palette.ink, background: "#fff" }}
                      >
                        {sortDir === "asc" ? "Low → High" : "High → Low"}
                      </button>
                    )}
                  </div>
                </FilterSection>

                <div className="pt-3">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ ...sans, fontSize: 12.5, color: palette.ink }}>
                    <input type="checkbox" checked={onlyVerifiedClean} onChange={(e) => setOnlyVerifiedClean(e.target.checked)} />
                    HPI clear & accident-free only
                  </label>
                </div>
              </aside>

              <div className="flex-1 min-w-0 w-full">
                <p style={{ ...sans, fontSize: 13, color: palette.slate, marginBottom: 16 }}>
                  {filtered.length.toLocaleString()} {{ Car: "cars", Motorcycle: "motorcycles", Van: "vans" }[category]} found
                </p>

                <div className="listings-grid">
                  {pageItems.map((l) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      onOpen={openListing}
                      distance={distances[l.id]}
                      saved={savedIds.includes(l.id)}
                      onToggleSave={toggleSaved}
                      compared={compareIds.includes(l.id)}
                      onToggleCompare={toggleCompare}
                      compareDisabled={!compareIds.includes(l.id) && compareIds.length >= 4}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p style={{ ...sans, fontSize: 13.5, color: palette.slateLight }}>No listings match those filters.</p>
                  )}
                </div>

                {filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-sm"
                      style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: page === 1 ? palette.slateLight : palette.ink, background: "#fff" }}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-sm"
                        style={{
                          ...sans, fontSize: 13, fontWeight: 500,
                          background: p === page ? palette.ink : "#fff",
                          color: p === page ? "#fff" : palette.ink,
                          border: `1px solid ${p === page ? palette.ink : palette.line}`,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-sm"
                      style={{ ...sans, fontSize: 13, fontWeight: 500, border: `1px solid ${palette.line}`, color: page === totalPages ? palette.slateLight : palette.ink, background: "#fff" }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "detail" && selected && (
          <ListingDetail listing={selected} onBack={() => setView("browse")} onMessage={messageSeller} onBookInspection={bookInspection} onMakeOffer={makeOffer} />
        )}

        {view === "sell" && (
          <SellerDashboard
            authUser={authUser}
            listings={listings}
            threads={threads}
            onAddListing={handlePublishAttempt}
            onOpenThread={openThreadForListing}
          />
        )}

        {view === "messages" && authUser && (
          <Messages
            threads={threads}
            listings={listings}
            activeId={activeThreadId}
            setActiveId={setActiveThreadId}
            onSend={sendMessage}
            onSetDealStatus={setDealStatus}
            onToggleAddOn={toggleAddOn}
            onRespondToOffer={respondToOffer}
            buyerName={authUser.name}
          />
        )}
      </main>

      {compareIds.length > 0 && view !== "compare" && (
        <div
          className="flex items-center justify-between gap-3 flex-wrap px-5 py-3"
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
            background: palette.ink, boxShadow: "0 -2px 10px rgba(27,36,48,0.2)",
          }}
        >
          <span style={{ ...sans, fontSize: 13, color: "#fff" }}>
            {compareIds.length} selected to compare{compareIds.length >= 4 ? " (max 4)" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareIds([])}
              className="px-3 py-1.5 rounded-sm"
              style={{ ...sans, fontSize: 12.5, fontWeight: 500, color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}
            >
              Clear
            </button>
            <button
              onClick={() => setView("compare")}
              disabled={compareIds.length < 2}
              className="px-4 py-1.5 rounded-sm"
              style={{ ...sans, fontSize: 12.5, fontWeight: 600, background: palette.amber, color: palette.ink, border: `1.5px solid ${palette.amberInk}`, opacity: compareIds.length < 2 ? 0.5 : 1 }}
            >
              {compareIds.length < 2 ? "Select 2+ to compare" : `Compare ${compareIds.length}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

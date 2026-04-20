"use client";
import { useState, useEffect, useCallback } from "react";

export interface DiscoveryCard {
  id: string;
  vendor_name: string;
  category: string;
  city: string;
  price_min: number;
  price_max: number;
  bio: string;
  images: string[];
  stats: { views: number; saves: number; enquiry_ready: number };
  sort_order: number;
}

export function useDiscoverFeed() {
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://dream-wedding-production-89ae.up.railway.app/api/v2/discovery/feed")
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load feed.");
        setLoading(false);
      });
  }, []);

  const preloadImages = useCallback((startIndex: number, count: number) => {
    for (let i = startIndex; i < Math.min(startIndex + count, cards.length); i++) {
      const img = new Image();
      img.src = cards[i].images[0];
    }
  }, [cards]);

  return { cards, loading, error, preloadImages };
}

import {
  Camera,
  Landmark,
  MapPin,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PlaceCategory } from "@/types";

export const CATEGORY_STYLE: Record<
  PlaceCategory,
  { labelKo: string; color: string; icon: LucideIcon }
> = {
  photo: { labelKo: "사진", color: "#ec4899", icon: Camera },
  food: { labelKo: "음식", color: "#f97316", icon: UtensilsCrossed },
  culture: { labelKo: "문화", color: "#8b5cf6", icon: Landmark },
  shopping: { labelKo: "쇼핑", color: "#22c55e", icon: ShoppingBag },
  experience: { labelKo: "체험", color: "#06b6d4", icon: Sparkles },
  local_tourism: { labelKo: "로컬 관광지", color: "#eab308", icon: MapPin },
  local_restaurant: {
    labelKo: "로컬 맛집",
    color: "#fb923c",
    icon: UtensilsCrossed,
  },
};

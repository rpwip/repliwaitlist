import { cn } from "@/lib/utils";

interface CloudCareLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CloudCareLogo({ className, size = "md" }: CloudCareLogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        className={sizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud */}
        <path
          d="M18.5 10.2c-.2-3.1-2.9-5.5-6-5.5-2.8 0-5.2 1.9-5.9 4.5-2.7.3-4.8 2.6-4.8 5.4 0 3 2.4 5.4 5.4 5.4h11.2c2.5 0 4.6-2.1 4.6-4.6 0-2.4-1.9-4.4-4.3-4.6"
          fill="#7C4DFF"
          stroke="#673AB7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Raindrop */}
        <path
          d="M12 13.5c-.8-1.2-2-3-2-4.2 0-1.1.9-2 2-2s2 .9 2 2c0 1.2-1.2 3-2 4.2z"
          fill="#2196F3"
          stroke="#1976D2"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-bold text-primary">CloudCare</span>
    </div>
  );
}

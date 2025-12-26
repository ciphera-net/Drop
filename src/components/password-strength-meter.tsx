import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!password) {
      setScore(0);
      return;
    }

    let points = 0;
    // Length check
    if (password.length >= 8) points += 1;
    if (password.length >= 12) points += 1;
    
    // Complexity checks
    if (/\d/.test(password)) points += 1; // Has number
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) points += 1; // Has special char
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1; // Mixed case

    // Cap at 4
    setScore(Math.min(points, 4));
  }, [password]);

  if (!password) return null;

  const getStrengthData = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return { color: "bg-red-500", label: "Weak", percent: 25 };
      case 2:
        return { color: "bg-orange-500", label: "Fair", percent: 50 };
      case 3:
        return { color: "bg-blue-500", label: "Good", percent: 75 };
      case 4:
        return { color: "bg-green-500", label: "Strong", percent: 100 };
      default:
        return { color: "bg-gray-200", label: "", percent: 0 };
    }
  };

  const { color, label, percent } = getStrengthData(score);

  return (
    <div className={cn("space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200", className)}>
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn("font-medium transition-colors", {
            "text-red-500": score <= 1,
            "text-orange-500": score === 2,
            "text-blue-500": score === 3,
            "text-green-500": score === 4
        })}>
            {label}
        </span>
      </div>
      
      <div className="h-1 w-full bg-secondary/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300 ease-out", color)} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

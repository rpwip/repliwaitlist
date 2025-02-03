import { cn } from "@/lib/utils";

export default function QueueNumber({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center font-mono font-bold text-primary",
        className
      )}
    >
      {String(number).padStart(3, "0")}
    </div>
  );
}

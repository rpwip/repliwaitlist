import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिंदी' }
] as const;

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2 text-primary-foreground">
        Language
      </label>
      <Select defaultValue="en" value={language} onValueChange={(value: any) => setLanguage(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
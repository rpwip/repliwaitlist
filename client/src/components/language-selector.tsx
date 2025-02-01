import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिंदी' }
] as const;

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  // Find the current language name
  const currentLanguage = languages.find(lang => lang.code === language)?.name || 'English';

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2 text-primary-foreground">
        Language
      </label>
      <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
        <SelectTrigger>
          <SelectValue>{currentLanguage}</SelectValue>
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
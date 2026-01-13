import { useState } from "react";
import { 
  Sparkles, ChevronRight, RotateCw, ShowerHead,
  Brain, Code, Lightbulb, Palette, Scale, Trophy,
  Zap, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

interface PromptCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  prompts: string[];
}

// Challenge categories designed to expose AI model differences
const CHALLENGE_CATEGORIES: PromptCategory[] = [
  {
    id: "creative",
    name: "Creative",
    icon: <Palette className="h-3.5 w-3.5" />,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20",
    description: "Test imagination & style",
    prompts: [
      "Write a haiku about the feeling of forgetting what you were about to say.",
      "Describe the color blue to someone who has never seen colors.",
      "Write a 6-word story that makes people cry.",
      "Invent a new word and give it a compelling definition.",
      "Write a limerick about procrastination from the perspective of tomorrow.",
      "Create a recipe for 'happiness soup' with emotional ingredients.",
      "Describe Monday morning as a movie villain introduction.",
      "Write a breakup letter from a phone to its owner who dropped it.",
    ],
  },
  {
    id: "logic",
    name: "Logic",
    icon: <Brain className="h-3.5 w-3.5" />,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
    description: "Test reasoning & deduction",
    prompts: [
      "A bat and ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost? Walk through your reasoning.",
      "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
      "You have 12 balls. One is heavier or lighter than the rest. Using a balance scale only 3 times, find the odd ball.",
      "A farmer has 17 sheep. All but 9 die. How many are left?",
      "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
      "You're in a room with 3 light switches. One controls a bulb in another room. You can only go to that room once. How do you figure out which switch controls it?",
      "What's heavier: a pound of feathers or a pound of gold? Explain the trick.",
      "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    ],
  },
  {
    id: "code",
    name: "Code",
    icon: <Code className="h-3.5 w-3.5" />,
    color: "text-green-500 bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
    description: "Test programming skills",
    prompts: [
      "Write a function to check if a string is a palindrome without using .reverse(). Explain your approach.",
      "FizzBuzz but make it interesting: add a creative twist the interviewer hasn't seen before.",
      "Debug this: why might 0.1 + 0.2 !== 0.3 in JavaScript, and how would you fix it?",
      "Write the shortest possible function to flatten a deeply nested array in JavaScript.",
      "Explain recursion to a 5-year-old, then show a practical example.",
      "What's wrong with this code: for(var i=0; i<5; i++) { setTimeout(() => console.log(i), 1000) }",
      "Write a regex that validates an email address. Now explain why it's probably still wrong.",
      "Implement a debounce function from scratch. When would you use it vs throttle?",
    ],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
    description: "Test facts & explanations",
    prompts: [
      "Explain quantum entanglement using only food metaphors.",
      "What would happen if the Moon disappeared tonight? Walk through 24 hours.",
      "Why is the sky blue? Now explain why sunsets are red.",
      "What's the difference between a virus and a bacterium? Explain like I'm 10.",
      "How does GPS know where you are? The simple and complex answer.",
      "Why can't we just print more money to solve poverty?",
      "Explain the difference between weather and climate to a skeptic.",
      "What actually happens in your brain when you form a memory?",
    ],
  },
  {
    id: "debate",
    name: "Debate",
    icon: <Scale className="h-3.5 w-3.5" />,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
    description: "Test balanced reasoning",
    prompts: [
      "Is free will an illusion if our choices are shaped by our past? Argue both sides.",
      "Should AI art be considered 'real' art? Steel-man both positions.",
      "Is it ethical to eat meat if lab-grown alternatives exist? Present the nuances.",
      "Should social media have age restrictions? What are the tradeoffs?",
      "Is working from home better than office work? Consider multiple perspectives.",
      "Should tipping culture be abolished? Argue for and against.",
      "Is privacy more important than security? Where's the line?",
      "Should billionaires exist? Examine the economic and ethical arguments.",
    ],
  },
  {
    id: "weird",
    name: "Weird",
    icon: <ShowerHead className="h-3.5 w-3.5" />,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20",
    description: "Shower thoughts & oddities",
    prompts: [
      "Lasagna is just spaghetti flavored cake. Change my mind.",
      "Your stomach thinks all potatoes are mashed. Discuss.",
      "Nothing is on fire. Fire is on things. How deep does this go?",
      "You've never seen your own face, only pictures and reflections. What are the implications?",
      "If you're waiting for the waiter, aren't you the waiter?",
      "Your brain named itself. What else has it done without asking?",
      "Coffee is just bean tea. What other foods are lying about their identity?",
      "Maybe plants are farming us by giving us oxygen until we die and decompose. Evaluate this theory.",
    ],
  },
];

// Quick challenge prompts that really expose model differences
const MODEL_SHOWDOWN_PROMPTS = [
  { text: "Count the R's in 'strawberry'", badge: "Viral Test", hot: true },
  { text: "Write 3 haikus about silence, each with a different emotion", badge: "Creative", hot: false },
  { text: "Explain why manhole covers are round", badge: "Logic", hot: false },
  { text: "Write a function to reverse a linked list", badge: "Code", hot: true },
  { text: "What's the most interesting thing about the number 1729?", badge: "Math", hot: false },
  { text: "Argue that water is actually dry", badge: "Absurd", hot: true },
  { text: "How many times does the letter 'e' appear in this sentence?", badge: "Meta", hot: true },
  { text: "Which weighs more: a pound of feathers or a pound of bricks?", badge: "Trick", hot: false },
  { text: "Write a story in exactly 50 words with a twist ending", badge: "Creative", hot: false },
  { text: "Is a hotdog a sandwich? Provide a rigorous argument", badge: "Debate", hot: true },
  { text: "Explain recursion without using 'recursion' or 'itself'", badge: "Code", hot: false },
  { text: "What comes next: 1, 11, 21, 1211, 111221, ?", badge: "Pattern", hot: true },
];

const PromptSuggestions = ({ onSelectPrompt }: PromptSuggestionsProps) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Showdown Dropdown */}
      <CategoryDropdown
        id="showdown"
        name="Showdown"
        icon={<Trophy className="h-3.5 w-3.5" />}
        prompts={MODEL_SHOWDOWN_PROMPTS.map(p => p.text)}
        onSelectPrompt={onSelectPrompt}
        defaultOpen={false}
      />

      {/* Category Dropdowns */}
      {CHALLENGE_CATEGORIES.map((category) => (
        <CategoryDropdown
          key={category.id}
          id={category.id}
          name={category.name}
          icon={category.icon}
          color={category.color}
          prompts={category.prompts}
          onSelectPrompt={onSelectPrompt}
        />
      ))}
    </div>
  );
};

interface CategoryDropdownProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  color?: string;
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  defaultOpen?: boolean;
}

const CategoryDropdown = ({ 
  id, 
  name, 
  icon, 
  color, 
  prompts, 
  onSelectPrompt,
  defaultOpen 
}: CategoryDropdownProps) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>(() => 
    shuffleArray(prompts).slice(0, 5)
  );

  const handleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePrompts(shuffleArray(prompts).slice(0, 5));
  };

  const handleSelect = (prompt: string) => {
    onSelectPrompt(prompt);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs font-medium border-dashed bg-background/50",
            open && "bg-accent text-accent-foreground border-solid",
            color && !open && "hover:bg-muted/50"
          )}
        >
          <span className={cn("flex items-center gap-1.5", color && !open && color.split(" ")[0])}>
            {icon}
            {name}
          </span>
          <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {icon}
              <span>{name} Prompts</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleShuffle}
              title="Shuffle"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-1.5 space-y-0.5">
            {visiblePrompts.map((prompt, index) => (
              <Button
                key={`${id}-${index}`}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-2.5 text-left whitespace-normal font-normal text-xs hover:bg-muted/50"
                onClick={() => handleSelect(prompt)}
              >
                <span className="line-clamp-2">{prompt}</span>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default PromptSuggestions;

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LayoutTemplate, Search, Crown, Lock, Sparkles, TrendingUp,
  Zap, Brain, Code, Lightbulb, Palette, Scale, MessageSquare,
  FileText, Users, Briefcase, GraduationCap, Heart, ChevronRight,
  Star, Eye, Copy
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  isPremium: boolean;
  usageCount: number;
  rating: number;
  tags: string[];
}

interface PromptTemplatesProps {
  onSelectPrompt: (prompt: string) => void;
  isPremiumUser?: boolean;
  premiumSlotsRemaining?: number;
  onTrackUsage?: (templateId: string, category: string) => void;
}

// Template categories with icons and colors
const TEMPLATE_CATEGORIES = [
  { id: "all", name: "All", icon: <LayoutTemplate className="h-4 w-4" />, color: "text-foreground" },
  { id: "productivity", name: "Productivity", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500" },
  { id: "creative", name: "Creative", icon: <Palette className="h-4 w-4" />, color: "text-pink-500" },
  { id: "coding", name: "Coding", icon: <Code className="h-4 w-4" />, color: "text-green-500" },
  { id: "analysis", name: "Analysis", icon: <Brain className="h-4 w-4" />, color: "text-blue-500" },
  { id: "business", name: "Business", icon: <Briefcase className="h-4 w-4" />, color: "text-purple-500" },
  { id: "learning", name: "Learning", icon: <GraduationCap className="h-4 w-4" />, color: "text-orange-500" },
  { id: "communication", name: "Communication", icon: <MessageSquare className="h-4 w-4" />, color: "text-cyan-500" },
];

// Curated prompt templates - mix of free and premium
const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Free templates
  {
    id: "brainstorm-ideas",
    title: "Brainstorm Ideas",
    description: "Generate creative ideas on any topic with structured output",
    prompt: "I need to brainstorm ideas about [TOPIC]. Please generate 10 unique and creative ideas, organized by:\n\n1. **Quick Wins** - Easy to implement\n2. **Medium Effort** - Require some work\n3. **Ambitious** - Bold ideas for the future\n\nFor each idea, include a one-sentence explanation of why it could work.",
    category: "creative",
    isPremium: false,
    usageCount: 2847,
    rating: 4.8,
    tags: ["ideas", "creativity", "planning"],
  },
  {
    id: "explain-concept",
    title: "Explain Like I'm 5",
    description: "Break down complex topics into simple terms",
    prompt: "Explain [CONCEPT] to me like I'm 5 years old. Use:\n- Simple everyday analogies\n- No jargon or technical terms\n- A fun example I can relate to\n\nThen, give me the 'grown-up' version in 2-3 sentences.",
    category: "learning",
    isPremium: false,
    usageCount: 3291,
    rating: 4.9,
    tags: ["learning", "simple", "education"],
  },
  {
    id: "compare-options",
    title: "Compare & Decide",
    description: "Make better decisions with structured comparisons",
    prompt: "Help me compare these options: [OPTION A] vs [OPTION B]\n\nAnalyze using this framework:\n📊 **Pros & Cons** - Key advantages and disadvantages\n💰 **Cost/Effort** - What does each require?\n⏱️ **Timeline** - How long until results?\n🎯 **Best For** - Who should choose which?\n\nEnd with a clear recommendation based on common priorities.",
    category: "analysis",
    isPremium: false,
    usageCount: 1956,
    rating: 4.7,
    tags: ["decision", "comparison", "analysis"],
  },
  {
    id: "debug-code",
    title: "Debug My Code",
    description: "Get systematic help fixing code issues",
    prompt: "I'm getting this error: [ERROR MESSAGE]\n\nHere's my code:\n```\n[PASTE CODE]\n```\n\nPlease:\n1. Explain what's causing the error\n2. Show the fixed code\n3. Explain what you changed and why\n4. Suggest how to prevent this in the future",
    category: "coding",
    isPremium: false,
    usageCount: 4521,
    rating: 4.9,
    tags: ["debugging", "code", "fix"],
  },
  
  // Premium templates
  {
    id: "strategic-memo",
    title: "Executive Strategy Memo",
    description: "Create C-suite ready strategic documents",
    prompt: "Write an executive strategy memo about [TOPIC/INITIATIVE].\n\n**Format:**\n- **Executive Summary** (3 sentences max)\n- **Strategic Context** - Why this matters now\n- **Recommended Actions** - Numbered, specific steps\n- **Resource Requirements** - Budget, people, time\n- **Risk Mitigation** - Top 3 risks and how to address\n- **Success Metrics** - How we'll measure progress\n- **Timeline** - Key milestones\n\nTone: Confident, data-driven, action-oriented. Length: 1 page.",
    category: "business",
    isPremium: true,
    usageCount: 892,
    rating: 4.9,
    tags: ["executive", "strategy", "memo"],
  },
  {
    id: "system-design",
    title: "System Design Interview",
    description: "Structure answers for system design interviews",
    prompt: "Design a system for [SYSTEM/FEATURE] (e.g., 'design Twitter's trending topics').\n\nWalk through:\n1. **Requirements Clarification** - What questions should I ask?\n2. **High-Level Design** - Core components and architecture\n3. **Data Model** - Key entities and relationships\n4. **API Design** - Main endpoints\n5. **Scalability** - How to handle growth\n6. **Trade-offs** - Key decisions and alternatives\n\nAssume I'm interviewing at a FAANG company.",
    category: "coding",
    isPremium: true,
    usageCount: 1247,
    rating: 4.8,
    tags: ["interview", "system-design", "architecture"],
  },
  {
    id: "viral-hook",
    title: "Viral Content Hook",
    description: "Create scroll-stopping hooks for social content",
    prompt: "Create 5 viral hooks for content about [TOPIC] for [PLATFORM].\n\nFor each hook:\n- **The Hook** - First 1-2 sentences that stop the scroll\n- **Why It Works** - Psychology behind it\n- **Best For** - What type of content/audience\n\nUse techniques like:\n- Curiosity gaps\n- Contrarian takes\n- Specific numbers\n- Pattern interrupts\n\nMake them feel authentic, not clickbait.",
    category: "creative",
    isPremium: true,
    usageCount: 2103,
    rating: 4.7,
    tags: ["viral", "hooks", "social"],
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes to Actions",
    description: "Transform meeting chaos into clear action items",
    prompt: "Transform these meeting notes into a structured summary:\n\n[PASTE NOTES]\n\n**Output Format:**\n📋 **Key Decisions Made**\n- Decision 1...\n\n✅ **Action Items**\n| Owner | Task | Due Date |\n|-------|------|----------|\n\n💡 **Key Insights/Ideas**\n\n❓ **Open Questions**\n\n📅 **Next Steps**",
    category: "productivity",
    isPremium: true,
    usageCount: 1567,
    rating: 4.8,
    tags: ["meetings", "notes", "actions"],
  },
  {
    id: "persona-research",
    title: "Customer Persona Builder",
    description: "Create detailed, actionable customer personas",
    prompt: "Create a detailed customer persona for [PRODUCT/SERVICE] targeting [AUDIENCE].\n\n**Include:**\n👤 **Demographics** - Age, location, income, education\n💭 **Psychographics** - Values, interests, personality\n😤 **Pain Points** - Top 3 frustrations\n✨ **Goals** - What success looks like\n🛒 **Buying Behavior** - How they research/decide\n📱 **Channels** - Where to reach them\n💬 **Messaging** - What resonates with them\n\nMake it specific enough to guide real marketing decisions.",
    category: "business",
    isPremium: true,
    usageCount: 743,
    rating: 4.6,
    tags: ["persona", "marketing", "research"],
  },
  {
    id: "code-review",
    title: "Senior Dev Code Review",
    description: "Get expert-level code review feedback",
    prompt: "Review this code as a senior developer:\n\n```\n[PASTE CODE]\n```\n\n**Evaluate:**\n- 🐛 **Bugs/Issues** - Potential problems\n- 🚀 **Performance** - Optimization opportunities  \n- 🧹 **Clean Code** - Readability improvements\n- 🔒 **Security** - Vulnerabilities\n- 🧪 **Testability** - How to test this\n- ⭐ **What's Good** - Positive aspects\n\nProvide specific line references and show improved code snippets.",
    category: "coding",
    isPremium: true,
    usageCount: 1823,
    rating: 4.9,
    tags: ["code-review", "senior", "quality"],
  },
  {
    id: "negotiation-script",
    title: "Negotiation Playbook",
    description: "Prepare for salary or deal negotiations",
    prompt: "Create a negotiation playbook for [SITUATION] (e.g., 'salary negotiation for a senior role').\n\n**Include:**\n🎯 **Your Position** - What you want and why\n🔬 **Research Points** - Data to support your ask\n🗣️ **Opening Script** - Exact words to start\n📊 **Anchoring** - Your initial ask and walk-away point\n🤔 **Objection Handlers** - Top 3 objections + responses\n🔄 **Trade-offs** - What you can offer/accept instead\n✅ **Closing** - How to seal the deal\n\nTone: Confident but collaborative.",
    category: "communication",
    isPremium: true,
    usageCount: 654,
    rating: 4.7,
    tags: ["negotiation", "salary", "scripts"],
  },
  {
    id: "learning-roadmap",
    title: "Learning Roadmap",
    description: "Create a structured plan to learn any skill",
    prompt: "Create a learning roadmap for [SKILL] starting from [LEVEL].\n\n**Format:**\n📍 **Phase 1: Foundations** (Week 1-2)\n- Topics to cover\n- Best resources (specific courses/books)\n- Practice exercises\n\n📍 **Phase 2: Building** (Week 3-4)\n[Same structure]\n\n📍 **Phase 3: Mastery** (Week 5-8)\n[Same structure]\n\n**Also include:**\n⏱️ Daily time commitment\n✅ Milestones to track progress\n🚧 Common pitfalls to avoid\n💡 Pro tips from experts",
    category: "learning",
    isPremium: true,
    usageCount: 1456,
    rating: 4.8,
    tags: ["learning", "roadmap", "skills"],
  },
];

// Premium slots for free users
const FREE_PREMIUM_SLOTS = 3;

const PromptTemplates = ({
  onSelectPrompt,
  isPremiumUser = false,
  premiumSlotsRemaining = FREE_PREMIUM_SLOTS,
  onTrackUsage,
}: PromptTemplatesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [usedPremiumSlots, setUsedPremiumSlots] = useState<string[]>(() => {
    const stored = localStorage.getItem("modelmix_used_premium_templates");
    return stored ? JSON.parse(stored) : [];
  });
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);

  // Persist premium slots usage
  useEffect(() => {
    localStorage.setItem("modelmix_used_premium_templates", JSON.stringify(usedPremiumSlots));
  }, [usedPremiumSlots]);

  const remainingSlots = isPremiumUser ? Infinity : Math.max(0, FREE_PREMIUM_SLOTS - usedPremiumSlots.length);

  const filteredTemplates = useMemo(() => {
    let templates = PROMPT_TEMPLATES;
    
    // Filter by category
    if (activeCategory !== "all") {
      templates = templates.filter(t => t.category === activeCategory);
    }
    
    // Filter by search
    if (search.trim()) {
      const lower = search.toLowerCase();
      templates = templates.filter(
        t => t.title.toLowerCase().includes(lower) || 
             t.description.toLowerCase().includes(lower) ||
             t.tags.some(tag => tag.toLowerCase().includes(lower))
      );
    }
    
    // Sort: free first for non-premium, then by usage
    return templates.sort((a, b) => {
      if (!isPremiumUser) {
        if (!a.isPremium && b.isPremium) return -1;
        if (a.isPremium && !b.isPremium) return 1;
      }
      return b.usageCount - a.usageCount;
    });
  }, [activeCategory, search, isPremiumUser]);

  const handleUseTemplate = (template: PromptTemplate) => {
    // Check premium access
    if (template.isPremium && !isPremiumUser) {
      if (!usedPremiumSlots.includes(template.id) && remainingSlots <= 0) {
        toast({
          title: "Premium slots exhausted",
          description: "Upgrade to access all premium templates",
          variant: "destructive",
        });
        return;
      }
      
      // Use a premium slot
      if (!usedPremiumSlots.includes(template.id)) {
        setUsedPremiumSlots(prev => [...prev, template.id]);
        toast({
          title: `Premium template unlocked`,
          description: `${remainingSlots - 1} free premium slots remaining`,
        });
      }
    }

    onSelectPrompt(template.prompt);
    onTrackUsage?.(template.id, template.category);
    setIsOpen(false);
    setPreviewTemplate(null);
    
    toast({
      title: "Template loaded",
      description: "Replace the [BRACKETS] with your content",
    });
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
    return cat?.icon;
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
    return cat?.color || "text-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 relative"
              >
                <LayoutTemplate className="h-4 w-4" />
                {!isPremiumUser && remainingSlots > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {remainingSlots}
                  </span>
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Prompt Templates</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <LayoutTemplate className="h-5 w-5 text-primary" />
                Prompt Templates
              </DialogTitle>
              <DialogDescription className="mt-1">
                Expert-crafted prompts to get the best AI responses
              </DialogDescription>
            </div>
            
            {!isPremiumUser && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Crown className="h-3 w-3 text-amber-500" />
                  {remainingSlots} premium slots
                </Badge>
              </div>
            )}
          </div>

          {/* Search and filters */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by title, description, or tag..."
                className="pl-10"
              />
            </div>
            
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5",
                    activeCategory === category.id && "bg-primary"
                  )}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className={activeCategory !== category.id ? category.color : ""}>
                    {category.icon}
                  </span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Templates grid */}
        <ScrollArea className="flex-1 h-[50vh]">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const isUnlocked = isPremiumUser || !template.isPremium || usedPremiumSlots.includes(template.id);
              const canUnlock = !template.isPremium || isPremiumUser || remainingSlots > 0 || usedPremiumSlots.includes(template.id);
              
              return (
                <Card 
                  key={template.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-md",
                    !canUnlock && "opacity-60",
                    template.isPremium && "ring-1 ring-amber-500/20"
                  )}
                >
                  {/* Premium badge */}
                  {template.isPremium && (
                    <div className="absolute top-3 right-3 z-10">
                      {isUnlocked ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                          <Crown className="h-3 w-3" />
                          Unlocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-background">
                          <Lock className="h-3 w-3" />
                          Premium
                        </Badge>
                      )}
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                        "bg-muted/50",
                        getCategoryColor(template.category)
                      )}>
                        {getCategoryIcon(template.category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight pr-16">
                          {template.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {template.usageCount.toLocaleString()} uses
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {template.rating}
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 gap-1.5"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 flex-1 gap-1.5"
                        onClick={() => handleUseTemplate(template)}
                        disabled={!canUnlock}
                      >
                        {template.isPremium && !isUnlocked ? (
                          <>
                            <Crown className="h-3.5 w-3.5" />
                            Use Slot
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Use Template
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No templates match your search</p>
            </div>
          )}
        </ScrollArea>

        {/* Premium upsell footer */}
        {!isPremiumUser && (
          <div className="px-6 py-4 border-t border-border bg-gradient-to-r from-amber-500/5 to-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-primary flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Unlock All Premium Templates</p>
                  <p className="text-xs text-muted-foreground">
                    Get unlimited access to expert prompts + new templates weekly
                  </p>
                </div>
              </div>
              <Button className="gap-2" variant="default">
                <Sparkles className="h-4 w-4" />
                Upgrade
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={getCategoryColor(previewTemplate.category)}>
                    {getCategoryIcon(previewTemplate.category)}
                  </span>
                  {previewTemplate.title}
                  {previewTemplate.isPremium && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 ml-2">
                      <Crown className="h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {previewTemplate.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Prompt Template
                </h4>
                <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono">
                  {previewTemplate.prompt}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Replace content in [BRACKETS] with your specific details
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => handleUseTemplate(previewTemplate)}
                  className="gap-1.5"
                >
                  <Copy className="h-4 w-4" />
                  Use This Template
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default PromptTemplates;

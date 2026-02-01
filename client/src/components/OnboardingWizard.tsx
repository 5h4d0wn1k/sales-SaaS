import { useState } from "react";
import { useBusinessProfile, useSaveBusinessProfile } from "@/hooks/use-business-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, Target, Users, Sparkles, Check, ArrowRight, ArrowLeft } from "lucide-react";

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Retail", "Manufacturing", 
  "Real Estate", "Education", "Marketing", "Consulting", "E-commerce", "Other"
];

const BUSINESS_TYPES = [
  "B2B", "B2C", "B2B2C", "Marketplace", "SaaS", "Agency", "Freelance"
];

const COMPANY_SIZES = [
  "Solo (1)", "Small (2-10)", "Medium (11-50)", "Large (51-200)", "Enterprise (200+)"
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const saveMutation = useSaveBusinessProfile();
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    businessType: "",
    targetMarket: "",
    companySize: "",
    website: "",
    description: "",
    idealCustomer: "",
    valueProposition: "",
    competitors: [] as string[],
  });
  const [competitorInput, setCompetitorInput] = useState("");

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCompetitor = () => {
    if (competitorInput.trim()) {
      setFormData(prev => ({ ...prev, competitors: [...prev.competitors, competitorInput.trim()] }));
      setCompetitorInput("");
    }
  };

  const handleSubmit = async () => {
    await saveMutation.mutateAsync(formData);
    onComplete();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.businessName && formData.industry && formData.businessType;
      case 2: return formData.targetMarket && formData.companySize;
      case 3: return formData.idealCustomer && formData.valueProposition;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-2xl">
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Define your target market"}
            {step === 3 && "Your value proposition"}
            {step === 4 && "Competitive landscape"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "This helps our AI agents understand your business and personalize outreach"}
            {step === 2 && "We'll use this to identify and prioritize the best leads for you"}
            {step === 3 && "This powers our personalized email and proposal generation"}
            {step === 4 && "Optional: Help us monitor your competitors"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                  placeholder="Your company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Select value={formData.industry} onValueChange={(v) => updateField("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Business Type *</Label>
                  <Select value={formData.businessType} onValueChange={(v) => updateField("businessType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Brief Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What does your company do in 1-2 sentences?"
                  rows={2}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select value={formData.companySize} onValueChange={(v) => updateField("companySize", v)}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetMarket">Target Market *</Label>
                <Textarea
                  id="targetMarket"
                  value={formData.targetMarket}
                  onChange={(e) => updateField("targetMarket", e.target.value)}
                  placeholder="Describe your ideal target market (e.g., 'Small to medium B2B SaaS companies in the US with 10-100 employees')"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="idealCustomer">Ideal Customer Profile *</Label>
                <Textarea
                  id="idealCustomer"
                  value={formData.idealCustomer}
                  onChange={(e) => updateField("idealCustomer", e.target.value)}
                  placeholder="Describe your ideal customer (job titles, pain points, what they're looking for)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valueProposition">Value Proposition *</Label>
                <Textarea
                  id="valueProposition"
                  value={formData.valueProposition}
                  onChange={(e) => updateField("valueProposition", e.target.value)}
                  placeholder="What unique value do you provide? Why should customers choose you?"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Competitors (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    placeholder="Competitor name"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                  />
                  <Button type="button" variant="outline" onClick={addCompetitor}>Add</Button>
                </div>
                {formData.competitors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.competitors.map((c, i) => (
                      <span key={i} className="bg-muted px-2 py-1 rounded text-sm flex items-center gap-1">
                        {c}
                        <button onClick={() => setFormData(prev => ({ ...prev, competitors: prev.competitors.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-foreground">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Ready to launch!</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI agents will now be configured specifically for your business. They'll help you:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Find leads matching your ideal customer profile</li>
                  <li>Generate personalized outreach based on your value proposition</li>
                  <li>Monitor competitors and market trends</li>
                  <li>Score and prioritize leads intelligently</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            ) : <div />}
            {step < totalSteps ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Setting up..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

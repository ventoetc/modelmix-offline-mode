import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Layers } from "lucide-react";

/**
 * ModelGroupsManager - Placeholder Component
 * 
 * This component requires the following database tables which have not been created yet:
 * - model_groups
 * - model_group_members  
 * - tier_model_access
 * - api_cost_preferences
 * 
 * Once these tables are created via migration, this component can be fully implemented.
 */
export default function ModelGroupsManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Model Groups & Tier Access
        </CardTitle>
        <CardDescription>
          Configure which models are available to different user tiers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Feature Not Yet Available</h3>
          <p className="text-muted-foreground max-w-md">
            Model Groups management requires additional database tables to be created. 
            This feature will be available once the database migration is complete.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Required tables: model_groups, model_group_members, tier_model_access, api_cost_preferences
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

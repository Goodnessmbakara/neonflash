import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NeonFlashLogo } from "@/components/ui/logo";

export default function Settings() {
  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div className="flex flex-col items-center mb-2">
        <NeonFlashLogo className="h-14 w-14 mb-2" />
                </div>
                <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
              </p>
            </div>
        <Card>
          <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings will be implemented here.
          </p>
          </CardContent>
        </Card>
    </div>
  );
}

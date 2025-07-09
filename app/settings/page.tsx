"use client"

import { Toaster } from "@/components/ui/toaster"
import Layout from "@/components/layout"
import Settings from "@/components/pages/settings"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <Settings />
      </Layout>
      <Toaster />
    </div>
  )
}

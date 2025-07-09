"use client"

import { Toaster } from "@/components/ui/toaster"
import Layout from "@/components/layout"
import Analytics from "@/components/pages/analytics"

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <Analytics />
      </Layout>
      <Toaster />
    </div>
  )
}

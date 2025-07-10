import { Toaster } from "@/components/ui/toaster"
import Layout from "@/components/layout"
import Dashboard from "@/components/pages/dashboard"

export default function HomePage() {
  return (
    <>
      <Layout>
        <Dashboard />
      </Layout>
      <Toaster />
    </>
  )
}
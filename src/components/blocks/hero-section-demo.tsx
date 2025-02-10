import { HeroSection } from "./hero-section-dark"

function HeroSectionDemo() {
  return (
    <HeroSection
      title="Host Your Games Online"
      subtitle={{
        regular: "Share your games with ",
        gradient: "the world instantly",
      }}
      description="Upload and host your HTML5 games with ease. Get a shareable link in seconds and let players enjoy your creations from anywhere."
      ctaText="Start Hosting"
      ctaHref="/upload"
      bottomImage={{
        light: "/dashboard-light.png",
        dark: "/dashboard-dark.png",
      }}
      gridOptions={{
        angle: 65,
        opacity: 0.4,
        cellSize: 50,
        lightLineColor: "#4a4a4a",
        darkLineColor: "#2a2a2a",
      }}
    />
  )
}

export { HeroSectionDemo } 
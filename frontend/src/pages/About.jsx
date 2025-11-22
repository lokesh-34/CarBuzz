import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Drive Your Story with CarBuzz
              </h1>
              <p className="mt-4 text-blue-100 text-lg max-w-xl">
                A simple, trusted way to rent self-driving cars from verified providers.
                Transparent pricing, smooth bookings, and a community you can rely on.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/cars" className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg shadow hover:shadow-md">
                  Browse Cars
                </Link>
                <Link to="/register/RegisterCarProviderForm" className="px-5 py-2.5 bg-blue-500/20 backdrop-blur border border-white/30 text-white font-semibold rounded-lg hover:bg-blue-500/30">
                  Become a Provider
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 rounded-2xl p-6 shadow-lg ring-1 ring-white/20">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <StatCard value="500+" label="Cars Listed" />
                  <StatCard value="200+" label="Providers" />
                  <StatCard value="5k+" label="Trips Booked" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <svg className="block w-full" viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg"><path fill="#f9fafb" d="M0,64L48,58.7C96,53,192,43,288,42.7C384,43,480,53,576,58.7C672,64,768,64,864,58.7C960,53,1056,43,1152,53.3C1248,64,1344,96,1392,112L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"/></svg>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-12">
        {/* Mission */}
        <section className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">
            We empower travelers and locals with reliable, transparent, and affordable self-driving rentals.
            CarBuzz connects vetted providers and verified users with an experience that feels effortless.
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">How it Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon="🔎" title="Browse" text="Explore by model, type, and price. See photos and full details." />
            <FeatureCard icon="📝" title="Book" text="Choose dates, share your trip info, and send a booking request." />
            <FeatureCard icon="🚗" title="Drive" text="Provider confirms, you pick up, and the road is yours." />
          </div>
        </section>

        {/* Safety & Trust */}
        <section className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Safety & Trust</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Providers verify identity and share car documents (RC, insurance).</li>
            <li>✅ Users sign in and provide license details for accountability.</li>
            <li>✅ Clear status tracking: pending, confirmed, rejected, or cancelled.</li>
          </ul>
        </section>

        {/* For Providers & Users */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-2">For Providers</h3>
            <p className="text-gray-700 mb-4">List vehicles in minutes, manage requests, and keep your calendar busy.</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Upload photos and documents</li>
              <li>Set pricing and availability</li>
              <li>Accept or reject requests</li>
            </ul>
            <Link to="/register/RegisterCarProviderForm" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Start Listing</Link>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-2">For Users</h3>
            <p className="text-gray-700 mb-4">Find the right car, get transparent pricing, and track every booking.</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Simple search and filters</li>
              <li>Clear trip status and history</li>
              <li>Responsive, verified providers</li>
            </ul>
            <Link to="/register" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Account</Link>
          </div>
        </section>

        {/* Testimonials */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What People Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial text="Smooth booking and a spotless car. Weekend trip was perfect!" author="Asha, User" />
            <Testimonial text="Listing my car took 10 minutes. Now it’s earning when I'm not using it." author="Rahul, Provider" />
            <Testimonial text="Prices were clear and the owner responded quickly. Would recommend." author="Meera, User" />
          </div>
        </section>

        {/* Contact CTA */}
        <section className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600" />
          <div className="relative p-8 md:p-10 text-white grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl font-bold">Questions or feedback?</h3>
              <p className="text-indigo-100 mt-1">We’d love to hear from you.</p>
            </div>
            <div className="md:text-right">
              <a href="mailto:carbuzzrental@gmail.com" className="inline-block px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg shadow hover:shadow-md">
                Email CarbuzzRental@gmai.com
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 ring-1 ring-white/20">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-blue-100 text-sm">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-transform hover:-translate-y-0.5">
      <div className="text-3xl mb-3" aria-hidden>{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}

function Testimonial({ text, author }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <p className="text-gray-700 italic">“{text}”</p>
      <p className="mt-3 text-sm text-gray-500">— {author}</p>
    </div>
  );
}

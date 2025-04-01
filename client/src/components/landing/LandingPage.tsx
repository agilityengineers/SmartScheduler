import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClockIcon, UsersIcon, LayersIcon } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-b from-white to-neutral-100 dark:from-slate-950 dark:to-slate-900 min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
                Smart Calendar for Teams
              </h1>
              <p className="text-xl text-neutral-700 dark:text-slate-300 mb-8">
                SmartScheduler helps teams organize their time with powerful role-based permissions, organization management, and seamless calendar integrations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-end">
              <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-lg rounded-lg overflow-hidden border border-neutral-200 dark:border-slate-700">
                <div className="p-4 bg-primary/10 dark:bg-primary/20 border-b border-neutral-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">March 2025</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                        <span className="sr-only">Previous month</span>
                        <span aria-hidden="true">&lt;</span>
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                        <span className="sr-only">Next month</span>
                        <span aria-hidden="true">&gt;</span>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-sm p-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="py-2 text-neutral-500 dark:text-slate-400">
                      {day}
                    </div>
                  ))}
                  {/* Empty cells for days before March 1st, 2025 - March 1st is a Saturday, so we need 6 empty cells */}
                  {[...Array(6)].map((_, i) => (
                    <div key={`empty-${i}`} className="p-2"></div>
                  ))}
                  
                  {/* Days of March 2025 - has 31 days */}
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const isToday = day === 31; // March 31st is highlighted as today
                    const hasEvents = [3, 10, 17, 24, 31].includes(day); // Events on Mondays
                    return (
                      <div
                        key={day}
                        className={`p-2 ${
                          isToday 
                            ? 'bg-primary text-white rounded-full' 
                            : hasEvents
                            ? 'text-primary font-semibold'
                            : 'text-neutral-800 dark:text-slate-300'
                        }`}
                      >
                        {day}
                        {hasEvents && (
                          <div className="h-1 w-1 bg-primary rounded-full mx-auto mt-1"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-neutral-200 dark:border-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center p-2 rounded-md bg-primary/10 dark:bg-primary/20">
                      <div className="w-2 h-full bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm">10:00 AM - Team Standup</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md">
                      <div className="w-2 h-full bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">2:00 PM - Project Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-900 dark:text-white">
            Powerful Features for Teams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<CalendarIcon className="h-8 w-8" />}
              title="Smart Scheduling"
              description="Intelligent scheduling that respects working hours and prevents conflicts."
            />
            <FeatureCard 
              icon={<UsersIcon className="h-8 w-8" />}
              title="Role-Based Access"
              description="Multi-tiered permissions for admins, company leaders, team managers, and users."
            />
            <FeatureCard 
              icon={<ClockIcon className="h-8 w-8" />}
              title="Calendar Integrations"
              description="Seamlessly connect with Google Calendar, Outlook, and more."
            />
            <FeatureCard 
              icon={<LayersIcon className="h-8 w-8" />}
              title="Team Organization"
              description="Manage organizations and teams with hierarchical structures."
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-neutral-100 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-900 dark:text-white">
            Trusted by Teams Everywhere
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="SmartScheduler revolutionized how our teams coordinate and plan their work."
              author="Sarah Johnson"
              role="CTO, TechCorp"
            />
            <TestimonialCard 
              quote="The role-based permissions save us from scheduling conflicts and confusion."
              author="Michael Chen"
              role="Team Lead, InnovateCo"
            />
            <TestimonialCard 
              quote="Since using SmartScheduler, our meeting efficiency has increased by 40%."
              author="Rachel Smith"
              role="Operations Manager, GlobalFirm"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of teams using SmartScheduler today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 hover:text-white w-full sm:w-auto">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-900 dark:bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2">
                <span className="material-icons text-primary">event</span>
                <h2 className="text-xl font-semibold">SmartScheduler</h2>
              </div>
              <p className="mt-2 text-neutral-400">
                The intelligent calendar for team collaboration
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
              <div>
                <h3 className="font-medium mb-2">Product</h3>
                <ul className="space-y-1 text-neutral-400">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">Pricing</a></li>
                  <li><a href="#" className="hover:text-white">Enterprise</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Resources</h3>
                <ul className="space-y-1 text-neutral-400">
                  <li><a href="#" className="hover:text-white">Documentation</a></li>
                  <li><a href="#" className="hover:text-white">Guides</a></li>
                  <li><a href="#" className="hover:text-white">API</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Company</h3>
                <ul className="space-y-1 text-neutral-400">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#" className="hover:text-white">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-800 text-center text-neutral-500">
            <p>© 2025 SmartScheduler. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-neutral-50 dark:bg-slate-800 p-6 rounded-lg border border-neutral-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="font-semibold text-xl mb-2 text-neutral-900 dark:text-white">{title}</h3>
      <p className="text-neutral-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-neutral-200 dark:border-slate-700 shadow-sm">
      <div className="text-primary text-4xl mb-4">"</div>
      <p className="text-neutral-700 dark:text-slate-300 mb-6">{quote}</p>
      <div>
        <p className="font-semibold text-neutral-900 dark:text-white">{author}</p>
        <p className="text-neutral-500 dark:text-slate-400 text-sm">{role}</p>
      </div>
    </div>
  );
}
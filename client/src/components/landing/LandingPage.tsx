import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClockIcon, UsersIcon, LayersIcon, ShieldCheckIcon } from 'lucide-react';

export default function LandingPage() {
  // The sample calendar is anchored to the current month. It used to be
  // hardcoded to March 2025, which made the marketing page look abandoned.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="bg-gradient-to-b from-white to-neutral-100 dark:from-slate-950 dark:to-slate-900">
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
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{monthLabel}</h3>
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
                  {[...Array(leadingBlanks)].map((_, i) => (
                    <div key={`empty-${i}`} className="p-2"></div>
                  ))}

                  {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const isToday = day === today.getDate();
                    // Sample events fall on Mondays. Illustrative, not real data.
                    const hasEvents = new Date(year, month, day).getDay() === 1;
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

      {/* How It Works */}
      <section className="py-16 bg-neutral-100 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-900 dark:text-white">
            How SmartScheduler Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Connect your calendar"
              description="Link Google Calendar or Outlook. SmartScheduler reads your existing events so it knows when you are genuinely free."
            />
            <StepCard
              step="2"
              title="Publish a booking link"
              description="Set your working hours, buffer times, minimum notice, and daily meeting limits, then share a personal or team booking link."
            />
            <StepCard
              step="3"
              title="Let meetings book themselves"
              description="Invitees pick a slot that actually works. The event is written to your calendar and everyone receives a confirmation."
            />
          </div>
        </div>
      </section>

      {/* Calendar Data Transparency */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <div className="text-primary mb-4">
              <ShieldCheckIcon className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-neutral-900 dark:text-white">
              Your Calendar Data
            </h2>
            <p className="text-neutral-700 dark:text-slate-300 mb-4">
              SmartScheduler requests access to your Google Calendar for two reasons: to read your
              existing events so it never offers a time slot you are already busy for, and to
              create, update, and cancel the meetings booked through your links.
            </p>
            <p className="text-neutral-700 dark:text-slate-300 mb-4">
              We do not sell your data, use it for advertising, or use it to train AI models. You
              can disconnect a calendar at any time from the Integrations page, which revokes our
              access with Google and deletes the stored tokens and synced events.
            </p>
            <p className="text-neutral-700 dark:text-slate-300 mb-6">
              Our use and transfer of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/privacy-policy">
                <Button variant="outline" className="w-full sm:w-auto">
                  Read our Privacy Policy
                </Button>
              </Link>
              <Link href="/terms-of-service">
                <Button variant="outline" className="w-full sm:w-auto">
                  Terms of Service
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Create an account, connect your calendar, and share your first booking link in minutes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-white border-white bg-transparent hover:bg-white/10 w-full sm:w-auto">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* No footer here - using the shared Footer component from parent */}
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

interface StepCardProps {
  step: string;
  title: string;
  description: string;
}

function StepCard({ step, title, description }: StepCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-neutral-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white font-semibold mb-4">
        {step}
      </div>
      <h3 className="font-semibold text-xl mb-2 text-neutral-900 dark:text-white">{title}</h3>
      <p className="text-neutral-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

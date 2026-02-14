import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3, TrendingUp, TrendingDown, Calendar, Users, Clock, Minus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalBookings: number;
    totalConfirmed: number;
    totalCancelled: number;
    totalRescheduled: number;
    thisWeekBookings: number;
    prevWeekBookings: number;
    totalBookingLinks: number;
  };
  bookingsOverTime: { date: string; count: number }[];
  popularDays: { day: string; count: number }[];
  popularHours: { hour: number; count: number }[];
  topEventTypes: { title: string; count: number }[];
  teamLeaderboard: { userId: number; name: string; bookingCount: number }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function Analytics() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/overview'],
  });

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const weekChange = analytics
    ? analytics.summary.thisWeekBookings - analytics.summary.prevWeekBookings
    : 0;
  const weekChangePercent = analytics?.summary.prevWeekBookings
    ? Math.round((weekChange / analytics.summary.prevWeekBookings) * 100)
    : 0;

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-slate-900">
      <AppHeader onCreateEvent={handleCreateEvent} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
              Analytics
            </h1>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="h-20 bg-neutral-100 dark:bg-slate-700 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-slate-400">Total Bookings</p>
                          <p className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
                            {analytics.summary.totalBookings}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-slate-400">Confirmed</p>
                          <p className="text-3xl font-bold text-green-600">
                            {analytics.summary.totalConfirmed}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-slate-400">Cancelled</p>
                          <p className="text-3xl font-bold text-red-500">
                            {analytics.summary.totalCancelled}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <TrendingDown className="h-6 w-6 text-red-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-slate-400">This Week</p>
                          <p className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
                            {analytics.summary.thisWeekBookings}
                          </p>
                          <div className="flex items-center mt-1">
                            {weekChange > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                            ) : weekChange < 0 ? (
                              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                            ) : (
                              <Minus className="h-3 w-3 text-neutral-400 mr-1" />
                            )}
                            <span className={`text-xs ${weekChange > 0 ? 'text-green-500' : weekChange < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                              {weekChange > 0 ? '+' : ''}{weekChangePercent}% vs last week
                            </span>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bookings Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Bookings Over Time (30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.bookingsOverTime}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                              }}
                              interval={4}
                            />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={false}
                              name="Bookings"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Popular Days */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Bookings by Day of Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.popularDays}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => v.substring(0, 3)}
                            />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bookings" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Popular Hours Heatmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Popular Booking Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.popularHours.filter(h => h.hour >= 6 && h.hour <= 22)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="hour"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(h) => {
                                if (h === 0) return '12am';
                                if (h < 12) return `${h}am`;
                                if (h === 12) return '12pm';
                                return `${h - 12}pm`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              labelFormatter={(h) => {
                                const hour = Number(h);
                                if (hour === 0) return '12:00 AM';
                                if (hour < 12) return `${hour}:00 AM`;
                                if (hour === 12) return '12:00 PM';
                                return `${hour - 12}:00 PM`;
                              }}
                              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                            />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Bookings" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Event Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Event Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.topEventTypes.length === 0 ? (
                        <p className="text-neutral-500 dark:text-slate-400 text-center py-8">
                          No booking data yet
                        </p>
                      ) : (
                        <div className="h-64 flex items-center">
                          <div className="w-1/2">
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={analytics.topEventTypes.slice(0, 6)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={80}
                                  dataKey="count"
                                  nameKey="title"
                                >
                                  {analytics.topEventTypes.slice(0, 6).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-1/2 space-y-2">
                            {analytics.topEventTypes.slice(0, 6).map((et, i) => (
                              <div key={et.title} className="flex items-center gap-2 text-sm">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                />
                                <span className="truncate text-neutral-700 dark:text-slate-300">
                                  {et.title}
                                </span>
                                <span className="ml-auto font-medium text-neutral-900 dark:text-slate-100">
                                  {et.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Team Leaderboard */}
                {analytics.teamLeaderboard.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Leaderboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.teamLeaderboard.map((member, i) => (
                          <div key={member.userId} className="flex items-center gap-4">
                            <span className="text-sm font-medium text-neutral-500 dark:text-slate-400 w-6 text-center">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                                  {member.name}
                                </span>
                                <span className="text-sm text-neutral-500 dark:text-slate-400">
                                  {member.bookingCount} bookings
                                </span>
                              </div>
                              <div className="w-full bg-neutral-100 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(member.bookingCount / analytics.teamLeaderboard[0].bookingCount) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 dark:text-slate-400">
                  No analytics data available yet. Start creating booking links and receiving bookings.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <Footer />
    </div>
  );
}

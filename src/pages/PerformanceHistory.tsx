import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Clock, User, Calendar } from 'lucide-react';
import { OpenMicDataService } from '@/services/OpenMicDataService';
import { toast } from 'sonner';

interface PerformanceRecord {
  id: string;
  artist_name: string;
  song_description: string | null;
  performed_at: string;
  created_at: string;
}

interface ArtistStats {
  name: string;
  count: number;
  lastPerformance: string;
}

interface HourStats {
  hour: number;
  count: number;
}

export default function PerformanceHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);
  const [limit, setLimit] = useState(50);

  // Analytics
  const [topArtists, setTopArtists] = useState<ArtistStats[]>([]);
  const [peakHours, setPeakHours] = useState<HourStats[]>([]);
  const [totalPerformances, setTotalPerformances] = useState(0);

  useEffect(() => {
    const initService = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/admin/login');
        return;
      }

      const service = new OpenMicDataService(undefined, token);
      
      // Check if token is valid
      const isAuthenticated = await service.isAdminAuthenticated();
      if (!isAuthenticated) {
        navigate('/admin/login');
        return;
      }

      setDataService(service);
      fetchHistory(service);
    };

    initService();
  }, [navigate, limit]);

  const fetchHistory = async (service: OpenMicDataService) => {
    try {
      setLoading(true);
      const data = await service.getPerformanceHistory(limit);
      setHistory(data);
      calculateAnalytics(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load performance history');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: PerformanceRecord[]) => {
    setTotalPerformances(data.length);

    // Top artists by performance count
    const artistMap = new Map<string, ArtistStats>();
    data.forEach(record => {
      const existing = artistMap.get(record.artist_name);
      if (existing) {
        existing.count++;
        if (new Date(record.performed_at) > new Date(existing.lastPerformance)) {
          existing.lastPerformance = record.performed_at;
        }
      } else {
        artistMap.set(record.artist_name, {
          name: record.artist_name,
          count: 1,
          lastPerformance: record.performed_at,
        });
      }
    });

    const sortedArtists = Array.from(artistMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTopArtists(sortedArtists);

    // Peak performance hours
    const hourMap = new Map<number, number>();
    data.forEach(record => {
      const hour = new Date(record.performed_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const sortedHours = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setPeakHours(sortedHours);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              Performance History
            </h1>
            <p className="text-muted-foreground mt-1">
              Analytics and records from past open mic nights
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Performances */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Performances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalPerformances}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          {/* Unique Artists */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Artists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{topArtists.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Have performed</p>
            </CardContent>
          </Card>

          {/* Most Active */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Active Artist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topArtists[0] ? (
                <>
                  <div className="text-2xl font-bold text-foreground truncate">
                    {topArtists[0].name}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {topArtists[0].count} performance{topArtists[0].count !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <div className="text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Artists & Peak Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top 10 Artists */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="w-5 h-5" />
                Top 10 Artists
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                By performance count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topArtists.map((artist, index) => (
                  <div
                    key={artist.name}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{artist.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Last: {formatDate(artist.lastPerformance)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-primary">{artist.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Peak Performance Hours
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Most popular time slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {peakHours.map((hourData, index) => (
                  <div
                    key={hourData.hour}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatHour(hourData.hour)}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {hourData.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance History List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Performances
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Showing last {history.length} performances
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={limit === 50 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLimit(50)}
                >
                  50
                </Button>
                <Button
                  variant={limit === 100 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLimit(100)}
                >
                  100
                </Button>
                <Button
                  variant={limit === 200 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLimit(200)}
                >
                  200
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No performance history yet
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{record.artist_name}</div>
                      {record.song_description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {record.song_description}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{formatDate(record.performed_at)}</div>
                      <div className="text-xs">{formatTime(record.performed_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

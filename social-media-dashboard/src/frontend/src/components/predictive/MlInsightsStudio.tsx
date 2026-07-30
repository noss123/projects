'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import {
  addTrackedTerm,
  generateIdeas,
  generateInsight,
  listTrackedTerms,
  predictPostEngagement,
  reloadMlModel,
  removeTrackedTerm,
  type MlIdeaResponse,
  type MlInsightResponse,
  type MlPredictResponse,
} from '@/lib/api/ml-insights-api';
import { Brain, Lightbulb, Loader2, Radar, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

const POST_TYPES = ['IG reel', 'IG image', 'IG carousel'] as const;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function MlInsightsStudio() {
  const [predictInput, setPredictInput] = useState({
    description: '',
    durationSec: '0',
    publishTime: '',
    postType: 'IG image',
  });
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResult, setPredictResult] = useState<MlPredictResponse | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const [ideasInput, setIdeasInput] = useState({ topic: '', postType: 'IG reel' });
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasResult, setIdeasResult] = useState<MlIdeaResponse | null>(null);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<MlInsightResponse | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  const [termsLoading, setTermsLoading] = useState(false);
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState('');
  const [termMessage, setTermMessage] = useState<string | null>(null);
  const [termError, setTermError] = useState<string | null>(null);

  const [reloadLoading, setReloadLoading] = useState(false);
  const [reloadMessage, setReloadMessage] = useState<string | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);

  const shapEntries = useMemo(
    () => Object.entries(predictResult?.shap_explanations || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])),
    [predictResult],
  );

  const loadTerms = useCallback(async () => {
    setTermsLoading(true);
    setTermError(null);
    try {
      const result = await listTrackedTerms();
      setTerms(Array.isArray(result.tracked_terms) ? result.tracked_terms : []);
    } catch (error) {
      setTermError((error as Error).message || 'Unable to load tracked terms.');
    } finally {
      setTermsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms().catch(() => {
      // Error state is handled in loadTerms.
    });
  }, [loadTerms]);

  const onPredict = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPredictError(null);

    if (!predictInput.description.trim()) {
      setPredictError('Caption/description is required.');
      return;
    }
    if (!predictInput.publishTime.trim()) {
      setPredictError('Publish time is required in MM/DD/YYYY HH:MM format.');
      return;
    }

    const duration = Number.parseInt(predictInput.durationSec, 10);
    if (Number.isNaN(duration) || duration < 0) {
      setPredictError('Duration must be a valid non-negative number.');
      return;
    }

    setPredictLoading(true);
    try {
      const result = await predictPostEngagement({
        description: predictInput.description.trim(),
        duration_sec: duration,
        publish_time: predictInput.publishTime.trim(),
        post_type: predictInput.postType,
      });
      setPredictResult(result);
    } catch (error) {
      setPredictError((error as Error).message || 'Prediction request failed.');
    } finally {
      setPredictLoading(false);
    }
  };

  const onGenerateIdeas = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdeasError(null);

    if (!ideasInput.topic.trim()) {
      setIdeasError('Topic is required.');
      return;
    }

    setIdeasLoading(true);
    try {
      const result = await generateIdeas({
        topic: ideasInput.topic.trim(),
        post_type: ideasInput.postType,
      });
      setIdeasResult(result);
    } catch (error) {
      setIdeasError((error as Error).message || 'Idea generation failed.');
    } finally {
      setIdeasLoading(false);
    }
  };

  const onGenerateInsight = async () => {
    setInsightError(null);
    setInsightLoading(true);
    try {
      const result = await generateInsight();
      setInsightResult(result);
    } catch (error) {
      setInsightError((error as Error).message || 'Insight generation failed.');
    } finally {
      setInsightLoading(false);
    }
  };

  const onAddTerm = async () => {
    const normalized = termInput.trim().toLowerCase();
    setTermError(null);
    setTermMessage(null);

    if (!normalized) {
      setTermError('Enter a term before adding.');
      return;
    }

    try {
      const result = await addTrackedTerm(normalized);
      setTermMessage(result.message);
      setTermInput('');
      await loadTerms();
    } catch (error) {
      setTermError((error as Error).message || 'Unable to add term.');
    }
  };

  const onRemoveTerm = async (term: string) => {
    setTermError(null);
    setTermMessage(null);
    try {
      const result = await removeTrackedTerm(term);
      setTermMessage(result.message);
      await loadTerms();
    } catch (error) {
      setTermError((error as Error).message || 'Unable to remove term.');
    }
  };

  const onReloadModel = async () => {
    setReloadError(null);
    setReloadMessage(null);
    setReloadLoading(true);
    try {
      const result = await reloadMlModel();
      setReloadMessage(result.message);
    } catch (error) {
      setReloadError((error as Error).message || 'Model reload failed.');
    } finally {
      setReloadLoading(false);
    }
  };

  const parsedInsight = useMemo(() => {
    if (!insightResult?.strategy_and_caption) return null;

    const text = insightResult.strategy_and_caption;

    const strategyMatch = text.split(/1\.\s*Strategic Recommendation:/i)[1]?.split(/2\./)[0];
    const captionMatch = text.split(/2\.\s*Ready-to-Post Caption.*?:/i)[1]?.split(/Rationale/i)[0];
    const rationaleMatch = text.split(/Rationale.*?:/i)[1];

    return {
      strategy: strategyMatch?.trim(),
      caption: captionMatch?.trim(),
      rationale: rationaleMatch?.trim(),
    };
  }, [insightResult]);

  const parsedIdeas = useMemo(() => {
    if (!ideasResult?.ideas) return [];

    const text = ideasResult.ideas;

    // Split by "Idea X:"
    const rawIdeas = text.split(/Idea \d+:/i).slice(1);

    return rawIdeas.map((ideaBlock, index) => {
      const titleMatch = ideaBlock.split("\n")[0];

      const hookMatch = ideaBlock.split(/Visual Hook\/Concept:/i)[1]?.split(/Full Caption:/i)[0];
      const captionMatch = ideaBlock.split(/Full Caption:/i)[1];

      return {
        title: `Idea ${index + 1}: ${titleMatch?.trim() || ""}`,
        hook: hookMatch?.trim(),
        caption: captionMatch?.trim(),
      };
    });
  }, [ideasResult]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-stone-700 flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-500" /> ML Engagement Studio
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Predict post engagement, generate ideas, monitor trend opportunities, and manage the trend watchlist.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-stone-800">
              <Sparkles className="h-4 w-4 text-amber-500" /> Engagement Prediction
            </CardTitle>
            <CardDescription className="text-xs">
              Submit a draft post to estimate like-rate and understand feature impact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPredict} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="predict-description">Caption / Description</Label>
                <textarea
                  id="predict-description"
                  value={predictInput.description}
                  onChange={(e) => setPredictInput((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Handcrafted with love... #handmade"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="predict-duration">Duration (sec)</Label>
                  <Input
                    id="predict-duration"
                    type="number"
                    min={0}
                    value={predictInput.durationSec}
                    onChange={(e) => setPredictInput((prev) => ({ ...prev, durationSec: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="predict-time">Publish Time (MM/DD/YYYY HH:MM)</Label>
                  <Input
                    id="predict-time"
                    value={predictInput.publishTime}
                    onChange={(e) => setPredictInput((prev) => ({ ...prev, publishTime: e.target.value }))}
                    placeholder="04/15/2026 18:30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Post Type</Label>
                <Select
                  value={predictInput.postType}
                  onValueChange={(value) => setPredictInput((prev) => ({ ...prev, postType: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select post type" />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {predictError && <p className="text-xs text-red-600">{predictError}</p>}
              <Button type="submit" disabled={predictLoading} className="bg-amber-500 text-white hover:bg-amber-600">
                {predictLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Run Prediction
              </Button>
            </form>

            {predictResult && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Predicted: {formatPercent(predictResult.predicted_like_rate)}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-stone-600">
                    Baseline: {formatPercent(predictResult.baseline_rate)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-stone-700">Top SHAP Drivers</p>
                  {shapEntries.length === 0 ? (
                    <p className="text-xs text-stone-500">No significant feature contributions returned.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {shapEntries.map(([feature, value]) => (
                        <div key={feature} className="flex items-center justify-between text-xs">
                          <span className="text-stone-600">
                            {feature
                              .replace(/_/g, " ")
                              .replace("Post type ", "")
                              .replace(/\b\w/g, c => c.toUpperCase())
                            }
                          </span>
                          <Badge className={value >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {value >= 0 ? '+' : ''}{value.toFixed(4)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-stone-800">
              <Lightbulb className="h-4 w-4 text-amber-500" /> AI Idea Generator
            </CardTitle>
            <CardDescription className="text-xs">
              Generate post ideas grounded in historical top performers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onGenerateIdeas} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ideas-topic">Topic</Label>
                <Input
                  id="ideas-topic"
                  value={ideasInput.topic}
                  onChange={(e) => setIdeasInput((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="Diwali gifting hampers"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Post Type</Label>
                <Select
                  value={ideasInput.postType}
                  onValueChange={(value) => setIdeasInput((prev) => ({ ...prev, postType: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select post type" />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ideasError && <p className="text-xs text-red-600">{ideasError}</p>}
              <Button type="submit" disabled={ideasLoading} className="bg-amber-500 text-white hover:bg-amber-600">
                {ideasLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Generate Ideas
              </Button>
            </form>

            {ideasResult && (
              <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                {ideasResult.message ? (
                  <p className="text-xs text-stone-600">{ideasResult.message}</p>
                ) : (
                  <div className="space-y-2">
                    {ideasResult.topic && (
                      <Badge variant="outline" className="bg-white text-stone-600">Topic: {ideasResult.topic}</Badge>
                    )}
                    <div className="space-y-3">

                      {parsedIdeas.map((idea, idx) => (
                        <div key={idx} className="rounded-lg border bg-white p-3 space-y-2">

                          {/* 💡 Title */}
                          <p className="text-xs font-semibold text-stone-800">
                            💡 {idea.title}
                          </p>

                          {/* 🎬 Hook */}
                          {idea.hook && (
                            <div className="p-2 rounded bg-blue-50 border border-blue-200">
                              <p className="text-[11px] font-medium text-blue-800 mb-1">
                                🎬 Visual Hook / Concept
                              </p>
                              <div className="prose prose-sm max-w-none text-blue-900">
                                <ReactMarkdown>
                                  {idea.hook}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* ✍️ Caption */}
                          {idea.caption && (
                            <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                              <p className="text-[11px] font-medium text-emerald-800 mb-1">
                                ✍️ Caption
                              </p>
                              <div className="prose prose-sm max-w-none text-emerald-900">
                                <ReactMarkdown>
                                  {idea.caption}
                                </ReactMarkdown>
                              </div>

                              {/* Copy button */}
                              <Button
                                size="sm"
                                className="mt-2 text-xs"
                                onClick={() => navigator.clipboard.writeText(idea.caption || "")}
                              >
                                Copy Caption
                              </Button>
                            </div>
                          )}

                        </div>
                      ))}

                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-stone-800">
              <Radar className="h-4 w-4 text-amber-500" /> Trend Insight Generator
            </CardTitle>
            <CardDescription className="text-xs">
              Run autonomous trend scanning with RAG-backed strategy and caption output.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onGenerateInsight} disabled={insightLoading} className="bg-amber-500 text-white hover:bg-amber-600">
              {insightLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Generate Insight
            </Button>
            {insightError && <p className="text-xs text-red-600">{insightError}</p>}
            {insightResult && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
                {insightResult.message ? (
                  <p className="text-xs text-stone-600">{insightResult.message}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {insightResult.detected_trend && (
                        <Badge className="bg-emerald-100 text-emerald-700">Trend: {insightResult.detected_trend}</Badge>
                      )}
                      {typeof insightResult.momentum === 'number' && (
                        <Badge variant="outline" className="bg-white text-stone-700">
                          Momentum: +{insightResult.momentum.toFixed(1)}%
                        </Badge>
                      )}
                      {typeof insightResult.historical_posts_referenced === 'number' && (
                        <Badge variant="outline" className="bg-white text-stone-700">
                          Context posts: {insightResult.historical_posts_referenced}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-3">

                      {/* 🧠 Strategy */}
                      {parsedInsight?.strategy && (
                        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                          <p className="text-xs font-semibold text-blue-800 mb-1">
                            🧠 Strategy
                          </p>
                          <div className="prose prose-sm max-w-none text-blue-900">
                            <ReactMarkdown>
                              {parsedInsight.strategy}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* ✍️ Caption */}
                      {parsedInsight?.caption && (
                        <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-800 mb-1">
                            ✍️ Ready-to-Post Caption
                          </p>
                          <div className="prose prose-sm max-w-none text-emerald-900">
                            <ReactMarkdown>
                              {parsedInsight.caption}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 📊 Rationale */}
                      {parsedInsight?.rationale && (
                        <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                          <p className="text-xs font-semibold text-amber-800 mb-1">
                            📊 Why This Works
                          </p>
                          <div className="prose prose-sm max-w-none text-amber-900">
                            <ReactMarkdown>
                              {parsedInsight.rationale}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-stone-800">
              <RefreshCw className="h-4 w-4 text-amber-500" /> Trend Watchlist Manager
            </CardTitle>
            <CardDescription className="text-xs">
              Add/remove tracked seed terms and refresh model artifacts after retraining.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder="e.g. khadi fabric"
              />
              <Button type="button" onClick={onAddTerm} className="bg-amber-500 text-white hover:bg-amber-600">
                Add
              </Button>
            </div>
            {termError && <p className="text-xs text-red-600">{termError}</p>}
            {termMessage && <p className="text-xs text-emerald-700">{termMessage}</p>}

            <div className="rounded-lg border border-stone-200 p-3 min-h-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-stone-700">Tracked Terms</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadTerms()}
                  disabled={termsLoading}
                  className="h-6 text-[11px]"
                >
                  {termsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
              {termsLoading ? (
                <p className="text-xs text-stone-500">Loading terms…</p>
              ) : terms.length === 0 ? (
                <p className="text-xs text-stone-500">No terms configured.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {terms.map((term) => (
                    <Badge key={term} variant="outline" className="bg-stone-50 text-stone-700 border-stone-300 pr-1">
                      <span className="mr-1">{term}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveTerm(term)}
                        className="inline-flex items-center rounded hover:text-red-600"
                        aria-label={`Remove ${term}`}
                        title={`Remove ${term}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-800">Admin: Hot Reload Model</p>
              <p className="text-[11px] text-amber-700">Use after fresh .joblib artifacts are generated by retraining.</p>
              <Button type="button" variant="outline" onClick={onReloadModel} disabled={reloadLoading} className="text-xs">
                {reloadLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Reload Model
              </Button>
              {reloadMessage && <p className="text-xs text-emerald-700">{reloadMessage}</p>}
              {reloadError && <p className="text-xs text-red-600">{reloadError}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

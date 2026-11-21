import type {
  ComparisonSummary,
  SessionResultsResponse,
  VoteStats,
} from '../types/comparison.ts';
import type { VoteOption } from '../utils/validation.ts';

class SessionStore {
  private votes = {
    cerebras: 0,
    groq: 0,
    equal: 0,
  };

  private predictionsTotal = 0;
  private predictionsCorrect = 0;
  private comparisons: ComparisonSummary[] = [];

  public recordComparison(summary: ComparisonSummary): void {
    this.comparisons.unshift(summary);
    if (this.comparisons.length > 25) {
      this.comparisons.pop();
    }

    if (summary.prediction !== null && summary.predictionCorrect !== null) {
      this.predictionsTotal += 1;
      if (summary.predictionCorrect) {
        this.predictionsCorrect += 1;
      }
    }
  }

  public recordVote(vote: VoteOption): VoteStats {
    this.votes[vote] += 1;
    return this.getVoteStats();
  }

  public getVoteStats(): VoteStats {
    const totalVotes = this.votes.cerebras + this.votes.groq + this.votes.equal;
    const toPercent = (count: number) =>
      totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;

    return {
      cerebras: this.votes.cerebras,
      groq: this.votes.groq,
      equal: this.votes.equal,
      totalVotes,
      cerebrasPercent: toPercent(this.votes.cerebras),
      groqPercent: toPercent(this.votes.groq),
      equalPercent: toPercent(this.votes.equal),
      predictionsTotal: this.predictionsTotal,
      predictionsCorrect: this.predictionsCorrect,
      persistenceNote: 'In-memory session store (active for the current server session only)',
    };
  }

  public getResults(): SessionResultsResponse {
    return {
      votes: this.getVoteStats(),
      latestComparison: this.comparisons[0] ?? null,
      recentComparisons: this.comparisons.slice(0, 10),
    };
  }

  public resetSession(): SessionResultsResponse {
    this.votes = { cerebras: 0, groq: 0, equal: 0 };
    this.predictionsTotal = 0;
    this.predictionsCorrect = 0;
    this.comparisons = [];
    return this.getResults();
  }
}

export const sessionStore = new SessionStore();

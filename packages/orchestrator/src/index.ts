import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { AgentWorkflow } from '@youli/shared';

export interface SquadInfo {
  name: string;
  displayName: string;
  hasConfig: boolean;
  workflows: AgentWorkflow[];
}

export class AioxOrchestrator {
  constructor(
    private readonly aiosCorePath = process.env.AIOS_CORE_PATH || '',
    private readonly squadsPath = process.env.SQUADS_PATH || ''
  ) {}

  health() {
    return {
      aiosCorePath: this.aiosCorePath,
      squadsPath: this.squadsPath,
      aiosCoreFound: fs.existsSync(this.aiosCorePath),
      squadsFound: fs.existsSync(this.squadsPath)
    };
  }

  loadSquads(): SquadInfo[] {
    if (!this.squadsPath || !fs.existsSync(this.squadsPath)) return [];

    return fs
      .readdirSync(this.squadsPath)
      .filter((name) => fs.statSync(path.join(this.squadsPath, name)).isDirectory())
      .map((name) => {
        const configPath = path.join(this.squadsPath, name, 'config.yaml');
        const hasConfig = fs.existsSync(configPath);
        let displayName = name;
        let workflows: AgentWorkflow[] = [];

        if (hasConfig) {
          const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as any;
          displayName = config?.squad?.display_name || name;
          const agentNames = Object.keys(config?.agents || {});
          workflows = agentNames.map((agentName, idx) => ({
            id: `${name}-wf-${idx + 1}`,
            squad: name,
            name: `route:${agentName}`,
            trigger: 'contextual'
          }));
        } else {
          workflows = [{ id: `${name}-wf-default`, squad: name, name: 'route:default', trigger: 'contextual' }];
        }

        return { name, displayName, hasConfig, workflows };
      });
  }

  routeInvisibleSquad(intent: 'planner' | 'health' | 'reflection' | 'execution') {
    const map = {
      planner: 'Planner Squad',
      health: 'Health Squad',
      reflection: 'Reflection Squad',
      execution: 'Execution Squad'
    } as const;

    return {
      routedTo: map[intent],
      mode: 'invisible',
      at: new Date().toISOString()
    };
  }

  dispatchIntent(intent: string) {
    const normalized = intent.toLowerCase();
    const squadRouting = [
      { test: /(finance|open-finance|conta|extrato|investimento)/, squad: 'Planner Squad', workflow: 'financial-clarity' },
      { test: /(task|exec|ação|decomposição|next step)/, squad: 'Execution Squad', workflow: 'execution-next-step' },
      { test: /(health|energia|sono|treino|strava)/, squad: 'Health Squad', workflow: 'energy-balance' },
      { test: /(insight|padrão|reflexão|comportamento)/, squad: 'Reflection Squad', workflow: 'pattern-mining' }
    ];

    const matched = squadRouting.find((x) => x.test.test(normalized));

    return {
      intent,
      routedTo: matched?.squad || 'Planner Squad',
      workflow: matched?.workflow || 'daily-operating-loop',
      executionMode: 'invisible',
      context: {
        aiosCorePath: this.aiosCorePath,
        squadsPath: this.squadsPath,
        squadsLoaded: this.loadSquads().length
      },
      timestamp: new Date().toISOString()
    };
  }
}

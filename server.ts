import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ViteDevServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliOption(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqPrefix = `${flag}=`;
  const match = process.argv.find((arg) => arg.startsWith(eqPrefix));
  return match ? match.slice(eqPrefix.length) : undefined;
}

const parsedPort = Number(parseCliOption('--port') ?? process.env.PORT);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3300;
const HOST = parseCliOption('--host') || '0.0.0.0';

interface DeathNotesRequestBody {
  causeOfDeath?: string;
  floor?: number;
  roomName?: string;
  roomSubtitle?: string;
  notesReadCount?: number;
  totalNotes?: number;
  flashlightOn?: boolean;
  survivedSeconds?: number;
  entityMode?:
    | 'vent-tentacles'
    | 'basement-stalker'
    | 'hall-stalker'
    | 'preacher'
    | 'spirit'
    | 'proctor'
    | 'hollow';
  visitedRooms?: string[];
}

interface PlayerFinalNote {
  stamp: string;
  fragment: string;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function buildFallbackNotes(body: DeathNotesRequestBody): PlayerFinalNote[] {
  const room = body.roomName || 'the corridor';
  const floorLabel = body.floor === 0 ? 'B1' : `Floor ${body.floor ?? 1}`;

  if (body.entityMode === 'hollow') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `Something tall in a high-collared funeral coat with a crown of blackened thorns stepped into ${room}. Its white porcelain mask split straight down the middle—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: 'Cold violet light poured out of the crack in its face while the shriek shook the windows. Almost slipped past its pale claws before—',
      },
    ];
  }

  if (body.entityMode === 'proctor') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `An amber lantern swung around the corner of ${room} and an iron cane tapped twice on the tile. I stepped upright instead of crouching and it snapped straight toward—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: 'Should have stayed crouched and kept my footsteps quiet down the corridor. The lantern light is filling the doorway now, I—',
      },
    ];
  }

  if (body.entityMode === 'spirit') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `A floating apparition materialized in ${room} right at head height. I stayed standing when I should have crouched down to let it pass—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: 'The blue stone only made the spirits angrier in the tunnels. Tried to slam a door behind me before it—',
      },
    ];
  }

  if (body.entityMode === 'preacher') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `The air in ${room} went cold and my vision warped around the edges. I thought I could sprint to the stairwell before the chime faded—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: 'Should have stood completely still until the ringing stopped. The lockers down the hall were empty, if only I had—',
      },
    ];
  }

  if (body.entityMode === 'hall-stalker') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `I got too far ahead and it crawled straight out of the ceiling grate. Now I hear something dragging down ${room} behind—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: body.flashlightOn
          ? 'The flashlight pushed it back a step down the hall, then it rounded the corner before I—'
          : 'Turned off my light in the hallway and felt cold breath right behind my—',
      },
    ];
  }

  if (body.entityMode === 'basement-stalker') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `Something slipped out of the grate behind ${room} while I kept walking. I thought it only stayed in the ducts, I didn't—`,
      },
      {
        stamp: 'Smudged Margin',
        fragment: reportLightHint(body.flashlightOn),
      },
    ];
  }

  return [
    {
      stamp: `${floorLabel} · Final Scrap`,
      fragment: `Black smoke is pouring out of the vent in ${room}. Every time I look up, whatever is inside stops moving, but when I turn away—`,
    },
    {
      stamp: 'Torn Cuff Note',
      fragment: body.flashlightOn
        ? 'I should have kept the beam straight on the louvers. It retreated once, then I heard metal scrape right above my—'
        : 'Thought the vents were just dead air. Something dark is reaching down from the grate and my light is still—',
    },
  ];
}

function reportLightHint(flashlightOn?: boolean): string {
  return flashlightOn
    ? 'The beam stopped it for a second in the tunnel, then my hand shook and it moved closer before I—'
    : 'Left the flashlight off to save my nerves, now something is standing right behind—';
}

const NOCTURNAL_URL = process.env.NOCTURNAL_URL?.trim().replace(/\/+$/, '') || '';
const NOCTURNAL_API_KEY = process.env.NOCTURNAL_API_KEY?.trim() || '';
const NOCTURNAL_MODEL = process.env.NOCTURNAL_MODEL?.trim() || 'default';
const isAgentSphereConfigured = Boolean(NOCTURNAL_URL && NOCTURNAL_API_KEY);

const aiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function generateNotesViaAgentSphere(
  systemInstruction: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(`${NOCTURNAL_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NOCTURNAL_API_KEY}`,
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      model: NOCTURNAL_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${systemInstruction}\nRespond ONLY with valid JSON matching: {"notes":[{"stamp":"string","fragment":"string"}]}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AgentSphere API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      aiConfigured: isAgentSphereConfigured || Boolean(aiClient),
      provider: isAgentSphereConfigured ? 'agentsphere' : aiClient ? 'gemini' : 'fallback',
      geminiConfigured: Boolean(aiClient),
    });
  });

  app.post('/api/death-notes', async (req, res) => {
    const body = (req.body ?? {}) as DeathNotesRequestBody;
    const floorLabel = body.floor === 0 ? 'Basement B1' : `Floor ${body.floor ?? 1}`;
    const roomName = String(body.roomName || 'Unknown Corridor').slice(0, 80);
    const causeOfDeath = String(body.causeOfDeath || 'Taken by the Vent Dweller').slice(0, 220);
    const notesReadCount = Number(body.notesReadCount ?? 0);
    const totalNotes = Number(body.totalNotes ?? 22);
    const flashlightOn = Boolean(body.flashlightOn);
    const survived = formatDuration(Number(body.survivedSeconds ?? 0));
    const visited = Array.isArray(body.visitedRooms)
      ? body.visitedRooms.slice(-6).map((r) => String(r).slice(0, 48)).join(', ')
      : roomName;

    if (!isAgentSphereConfigured && !aiClient) {
      res.status(200).json({
        source: 'fallback',
        notes: buildFallbackNotes(body),
      });
      return;
    }

    const modeDesc =
      body.entityMode === 'hollow'
        ? 'The Hollow—a tall, thorn-crowned wraith in a high-collared tattered funeral shroud with tarnished pewter sternum clasps, bandaged arms with elongated pale ivory claws, and a vertically split porcelain mask that hinges open to reveal a glowing cold-violet void'
        : body.entityMode === 'proctor'
          ? 'The Proctor—a tall, gaunt hall-monitor stalker in a tattered dark greatcoat carrying a swinging brass storm lantern and tapping an iron cane; it hunts upright footsteps, sprinting, and door toggles across Floors 1–4, sweeping corridors with its amber lantern cone unless the explorer crouches quietly or hides in a locker or under a desk'
          : body.entityMode === 'spirit'
            ? 'Restless Spirits—head-height floating apparitions that materialize and chase the explorer into lockers or classrooms; they appear far more often in Basement B1, grow violently aggravated by the Soother Gem, and streak harmlessly overhead if the explorer crouches'
            : body.entityMode === 'preacher'
              ? 'The Preacher—a tall shrouded entity that emits a dissonant bell/chime and warps the explorer\'s vision; moving during the warning triggers a relentless chase across floors 1F-4F until hiding in a locker'
              : body.entityMode === 'basement-stalker'
                ? 'Emerged from a grate and stalked the player through the open basement tunnels'
                : body.entityMode === 'hall-stalker'
                  ? 'Emerged out of the vents after being left far behind and roamed the dark school hallways'
                  : 'Black fog & tentacles emerging from a ceiling/wall vent';

    try {
      const entityName =
        body.entityMode === 'hollow'
          ? 'The Hollow'
          : body.entityMode === 'proctor'
            ? 'The Proctor'
            : body.entityMode === 'spirit'
              ? 'a Restless Spirit'
              : body.entityMode === 'preacher'
                ? 'The Preacher'
                : 'the Vent Dweller';
      const prompt = [
        `Write 3 very short, cryptic first-person final notes scribbled by a terrified trespasser exploring an abandoned modern school at night, right before being killed by ${entityName}.`,
        'Context from this run:',
        `- Location of death: ${roomName} (${floorLabel})`,
        `- Cause of death: ${causeOfDeath}`,
        `- Entity mode: ${modeDesc}`,
        `- Flashlight was: ${flashlightOn ? 'ON' : 'OFF'}`,
        `- School notes read before death: ${notesReadCount} of ${totalNotes}`,
        `- Time survived: ${survived}`,
        `- Recent rooms passed through: ${visited}`,
        '',
        'Rules:',
        '- Each note must be 1 to 2 short sentences (under 30 words each).',
        '- Every single note MUST trail off mid-sentence at the very end using an em-dash (—) or ellipsis (...), cut off as if the writer stopped abruptly.',
        '- First-person ("I", "my"), whispered/urgent, grounded in vents, watching eyes, black fog, flashlight beam, or basement tunnels.',
        '- Give each note a short 2–4 word paper/location stamp (e.g. "Folded Sleeve Note", "Floor 2 Margin").',
      ].join('\n');

      const systemInstruction =
        'You author terse, unsettling atmospheric horror fragments written from a doomed explorer\'s perspective. Never break character, never use hashtags or clichés, and always cut off mid-sentence.';

      let rawText = '';
      let source: 'agentsphere' | 'gemini' = 'gemini';

      if (isAgentSphereConfigured) {
        source = 'agentsphere';
        rawText = await generateNotesViaAgentSphere(systemInstruction, prompt);
      } else if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            abortSignal: AbortSignal.timeout(7000),
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                notes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stamp: {
                        type: Type.STRING,
                        description: 'Short 2-4 word label for the scrap of paper or moment.',
                      },
                      fragment: {
                        type: Type.STRING,
                        description: 'Short cryptic first-person thought trailing off mid-sentence with — or ...',
                      },
                    },
                    required: ['stamp', 'fragment'],
                  },
                },
              },
              required: ['notes'],
            },
          },
        });
        rawText = (response.text ?? '').trim();
      }

      const parsed = JSON.parse(rawText) as { notes?: PlayerFinalNote[] };
      const cleaned = Array.isArray(parsed.notes)
        ? parsed.notes
            .filter((n) => n && typeof n.fragment === 'string' && n.fragment.trim().length > 0)
            .slice(0, 3)
            .map((n) => ({
              stamp: String(n.stamp || `${floorLabel} · Scrap`).slice(0, 40),
              fragment: String(n.fragment).trim().slice(0, 220),
            }))
        : [];

      if (cleaned.length === 0) {
        res.status(200).json({
          source: 'fallback',
          notes: buildFallbackNotes(body),
        });
        return;
      }

      res.status(200).json({
        source,
        notes: cleaned,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate player death notes.';
      res.status(502).json({
        error: message,
        fallbackNotes: buildFallbackNotes(body),
      });
    }
  });

  const httpServer = http.createServer(app);
  let viteServer: ViteDevServer | null = null;

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const viteReady = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            hmr: hmrDisabled ? false : { server: httpServer },
          },
          appType: 'spa',
        }),
      )
      .then((vite) => {
        viteServer = vite;
        return vite;
      });

    viteReady.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
      process.exit(1);
    });

    app.use((req, res, next) => {
      if (viteServer) {
        viteServer.middlewares(req, res, next);
        return;
      }
      viteReady
        .then((vite) => {
          vite.middlewares(req, res, next);
        })
        .catch(next);
    });
  }

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down server...`);
    const closeVite = viteServer ? viteServer.close().catch(() => undefined) : Promise.resolve();
    closeVite.finally(() => {
      httpServer.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 1500).unref();
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err);
    process.exit(1);
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`Nocturnal Campus server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

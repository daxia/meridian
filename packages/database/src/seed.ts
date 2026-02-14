import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { $data_sources } from './schema';
import { getDb } from './database';

async function main() {
  const db = getDb(process.env.DATABASE_URL!);

  const sources = [
    {
      name: 'Hacker News',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://news.ycombinator.com/rss',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 60,
    },
    {
      name: 'The Verge',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://www.theverge.com/rss/index.xml',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 60,
    },
    {
      name: 'OpenAI Blog',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://openai.com/news/rss.xml',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 180,
    },
    {
      name: 'Hugging Face Blog',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://huggingface.co/blog/feed.xml',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 180,
    },
    {
      name: "Lil'Log (Lilian Weng)",
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://lilianweng.github.io/index.xml',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 1440,
    },
    {
      name: 'Google Research Blog',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'http://feeds.feedburner.com/blogspot/gJZg',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 180,
    },
    {
      name: 'Berkeley AI Research (BAIR)',
      source_type: 'RSS',
      config: {
        source_type: 'RSS',
        config: {
          url: 'https://bair.berkeley.edu/blog/feed.xml',
          config_schema_version: '1.0',
          rss_paywall: false,
        },
      },
      scrape_frequency_minutes: 1440,
    },
  ];

  for (const source of sources) {
    // Check if exists to avoid duplicates (since name is not unique constraint in DB yet)
    const existing = await db
      .select()
      .from($data_sources)
      .where(eq($data_sources.name, source.name));

    if (existing.length === 0) {
      await db.insert($data_sources).values(source as any);
      console.log(`Inserted ${source.name}`);
    } else {
      await db
        .update($data_sources)
        .set({ config: source.config as any })
        .where(eq($data_sources.name, source.name));
      console.log(`Updated ${source.name}`);
    }
  }
}

main()
  .then(() => {
    console.log('✅ Seeded database');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error seeding database', err);
    process.exit(1);
  });

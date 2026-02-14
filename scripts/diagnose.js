/**
 * 简报生成诊断脚本
 *
 * 该脚本帮助诊断 GenerateBriefWorkflow 无法找到文章的问题
 */

import 'dotenv/config';
import { getDb } from '../packages/database/src/database.js';
import { $ingested_items } from '../packages/database/src/schema.js';

async function main() {
  console.log('🔍 开始诊断...\n');

  const db = getDb(process.env.DATABASE_URL);

  try {
    //1. 查询文章总数
    const totalItems = await db.select().from($ingested_items);
    const totalCount = totalItems.length;
    console.log(`\n📊 文章总数: ${totalCount}\n`);

    //2. 查询各状态文章数量
    const statusCounts = {};
    for (const item of totalItems) {
      const status = item.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    console.log('\n📈 各状态文章统计:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

    //3. 查询最近 10 条 PROCESSED 文章
    const processedItems = totalItems
      .filter(item => item.status === 'PROCESSED')
      .sort((a, b) => {
        const timeA = a.processed_at || new Date(0);
        const timeB = b.processed_at || new Date(0);
        return timeB.getTime() - timeA.getTime();
      })
      .slice(0, 10);

    console.log('\n✅ 最近 10 条 PROCESSED 文章:');
    processedItems.forEach((item, idx) => {
      const hasEmbedding = !!item.embedding;
      const timeAgo = item.processed_at
        ? Math.round((Date.now() - item.processed_at.getTime()) / 1000 / 60 / 60)
        : 'N/A';
      const title = item.display_title || '(No title)';
      console.log(`  ${idx + 1}. ID:${item.id}, Title:"${title.substring(0, 50)}...", Embedding:${hasEmbedding ? 'Yes' : 'No'} ${timeAgo !== 'N/A' ? `(${timeAgo}h ago)` : ''}`);
    });

    //4. 查询最近 10 条 FAILED 文章
    const failedItems = totalItems
      .filter(item => item.status && item.status.startsWith('FAILED'))
      .sort((a, b) => {
        const timeA = a.processed_at || new Date(0);
        const timeB = b.processed_at || new Date(0);
        return timeB.getTime() - timeA.getTime();
      })
      .slice(0, 10);

    console.log('\n❌ 最近 10 条 FAILED 文章:');
    failedItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ID:${item.id}, Status:${item.status}, FailReason:"${item.fail_reason}"`);
    });

    //5. 查询过去 24 小时的 PROCESSED 文章（有 embedding）
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const articlesInLast24h = totalItems.filter(item =>
      item.status === 'PROCESSED' &&
      item.embedding !== null &&
      item.processed_at &&
      item.processed_at >= since
    );

    console.log(`\n⏰ 过去 24 小时的 PROCESSED 文章（有 embedding）: ${articlesInLast24h.length}`);

    //6. 诊断结论
    console.log('\n🎯 诊断结论:');
    if (articlesInLast24h.length === 0) {
      console.log('  ❌ 问题：过去 24 小时没有符合条件的文章');
      console.log('  📋 可能原因：');
      console.log('    1. RSS 抓取未运行或刚启动，还没有处理完成的文章');
      console.log('    2. 文章处理工作流失败，所有文章停留在 NEW 或 FAILED 状态');
      console.log('    3. Embedding 生成失败，PROCESSED 文章没有 embedding');
      console.log('    4. 所有文章的 processed_at 都超过 24 小时前');
      console.log('\n  ✅ 建议解决方案：');
      console.log('    1. 等待一段时间，让 RSS 抓取和处理完成');
      console.log('    2. 使用批量重新处理功能重新处理 NEW 和 FAILED 文章');
      console.log('    3. 增加 hoursLookback 参数，扩大时间范围（如 72 小时）');
      console.log('    4. 检查 Durable Objects 是否已初始化（调用初始化 API）');
    } else {
      console.log('  ✅ 符合条件的文章数量正常');
      console.log('    如果简报生成仍然失败，请检查日志中的其他错误');
    }

  } catch (error) {
    console.error('\n❌ 诊断失败:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();

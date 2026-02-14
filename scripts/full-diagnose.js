/**
 * 完整诊断脚本
 * 检查简报生成相关的所有信息
 */

import 'dotenv/config';
import { getDb } from '../packages/database/src/database.js';
import { $ingested_items, $reports, $data_sources } from '../packages/database/src/schema.js';

async function main() {
  console.log('🔍 完整诊断开始...\n');

  const db = getDb(process.env.DATABASE_URL);

  try {
    // ========================================
    // 1. 文章统计
    // ========================================
    console.log('\n📊 1. 文章统计');
    
    const allItems = await db.select().from($ingested_items);
    const totalCount = allItems.length;
    console.log(`   总文章数: ${totalCount}\n`);

    // 各状态统计
    const statusCounts = {};
    for (const item of allItems) {
      const status = item.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    console.log('\n   各状态文章统计:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });

    // ========================================
    // 2. PROCESSED 文章详细分析
    // ========================================
    console.log('\n✅ 2. PROCESSED 文章详细分析');
    
    const processedItems = allItems
      .filter(item => item.status === 'PROCESSED')
      .sort((a, b) => {
        const timeA = a.processed_at || new Date(0);
        const timeB = b.processed_at || new Date(0);
        return timeB.getTime() - timeA.getTime();
      })
      .slice(0, 20); // 最近20条

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let processedIn24h = 0;
    let processedIn7d = 0;
    let processedWithEmbedding = 0;
    let processedWithoutEmbedding = 0;

    console.log(`\n   最近 20 条 PROCESSED 文章:`);
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      const hasEmbedding = !!item.embedding;
      const processedAt = item.processed_at;
      const timeAgo = processedAt ? Math.round((now - processedAt.getTime()) / 1000 / 60 / 60) : 'N/A';
      
      // 统计
      if (processedAt) {
        if (processedAt >= oneDayAgo) processedIn24h++;
        if (processedAt >= sevenDaysAgo) processedIn7d++;
      }
      if (hasEmbedding) processedWithEmbedding++;
      else processedWithoutEmbedding++;

      console.log(`   ${i + 1}. ID:${item.id}, Embedding:${hasEmbedding ? 'Yes' : 'No'}, ${timeAgo !== 'N/A' ? `${timeAgo}h ago` : 'No time'}`);
    }

    console.log(`\n   统计:`);
    console.log(`   过去24小时的 PROCESSED 文章: ${processedIn24h}`);
    console.log(`   过去7天的 PROCESSED 文章: ${processedIn7d}`);
    console.log(`   有 embedding 的 PROCESSED 文章: ${processedWithEmbedding}`);
    console.log(`   无 embedding 的 PROCESSED 文章: ${processedWithoutEmbedding}`);

    // ========================================
    // 3. 简报统计
    // ========================================
    console.log('\n📑 3. 简报统计');
    
    const allReports = await db
      .select({
        id: $reports.id,
        title: $reports.title,
        totalArticles: $reports.totalArticles,
        usedArticles: $reports.usedArticles,
        createdAt: $reports.created_at
      })
      .from($reports)
      .orderBy($reports.created_at, 'desc');

    console.log(`   总简报数: ${allReports.length}`);

    if (allReports.length > 0) {
      console.log('\n   最近生成的简报:');
      for (let i = 0; i < Math.min(allReports.length, 5); i++) {
        const report = allReports[i];
        const createdAt = report.createdAt || new Date(0);
        const timeAgo = Math.round((now - createdAt.getTime()) / 1000 / 60 / 60);
        console.log(`   ${i + 1}. "${report.title}" - ${timeAgo}h ago (${report.totalArticles || 0} articles)`);
      }
    } else {
      console.log('   ❌ 数据库中没有简报记录');
    }

    // ========================================
    // 4. 数据源统计
    // ========================================
    console.log('\n📡 4. 数据源统计');
    
    const allSources = await db
      .select({
        id: $data_sources.id,
        name: $data_sources.name,
        source_type: $data_sources.source_type,
        lastChecked: $data_sources.lastChecked
        scrape_frequency_minutes: $data_sources.scrape_frequency_minutes
      })
      .from($data_sources);

    console.log(`   数据源总数: ${allSources.length}`);

    if (allSources.length > 0) {
      console.log('\n   数据源列表:');
      for (const source of allSources) {
        const lastChecked = source.lastChecked || 'Never';
        const timeAgo = source.lastChecked 
          ? Math.round((now - source.lastChecked.getTime()) / 1000 / 60 / 60)
          : 'N/A';
        
        console.log(`   ID:${source.id}, Name:"${source.name}", Type:${source.source_type}, Frequency:${source.scrape_frequency_minutes}min, LastCheck:${lastChecked} (${timeAgo}h ago)`);
      }
    }

    // ========================================
    // 5. 诊断结论
    // ========================================
    console.log('\n🎯 5. 诊断结论');
    console.log('\n   简报生成问题:');

    if (processedIn24h === 0) {
      console.log('   ❌ 确认：过去24小时没有 PROCESSED 文章');
      console.log('   📋 可能原因：');
      
      if (processedItems.length === 0) {
        console.log('     1. 数据库中没有 PROCESSED 状态的文章');
        console.log('     2. RSS 抓取可能尚未完成');
        console.log('     3. ProcessIngestedItemWorkflow 可能还未运行或失败');
      } else {
        console.log('     1. PROCESSED 文章的 processed_at 都超过24小时前');
        console.log('     2. 系统长时间未运行');
        console.log('     3. Cron 定时任务可能未正常执行');
      }

      console.log('\n   ✅ 建议解决方案：');
      console.log('     1. 初始化所有数据源调度器（调用 POST /admin/initialize-dos）');
      console.log('     2. 等待 1-2 小时，让 RSS 抓取完成');
      console.log('     3. 或者扩大简报生成时间范围（72小时）');
    } else {
      console.log('   ✅ 确认：过去24小时有 PROCESSED 文章');
      
      if (processedWithEmbedding === 0) {
        console.log('   ⚠️  问题：所有 PROCESSED 文章都没有 embedding');
        console.log('   📋 可能原因：');
        console.log('     1. Embedding 生成失败（ML Service 问题）');
        console.log('     2. ProcessIngestedItemWorkflow 中 embedding 生成步骤失败');
        
        console.log('\n   ✅ 建议解决方案：');
        console.log('     1. 检查 ML Service 是否运行（端口 8000）');
        console.log('     2. 检查 embedding 生成错误日志');
        console.log('     3. 重新生成有 embedding 的文章');
      } else {
        console.log('   ✅ 正常：有符合条件的文章');
        console.log('   ℹ️  如果简报仍然生成失败，请查看完整错误日志');
      }
    }

    // ========================================
    // 6. 系统检查
    // ========================================
    console.log('\n⚙️  6. 系统检查');
    
    // 检查 processedAt 字段
    const itemsWithoutProcessedAt = allItems.filter(item => item.status === 'PROCESSED' && !item.processed_at);
    if (itemsWithoutProcessedAt.length > 0) {
      console.log(`   ⚠️  发现 ${itemsWithoutProcessedAt.length} 条 PROCESSED 文章缺少 processed_at 字段`);
    }

    // 检查 embedding 字段
    const itemsWithNullEmbeddingButProcessed = allItems.filter(item => item.status === 'PROCESSED' && item.embedding === null);
    if (itemsWithNullEmbeddingButProcessed.length > 0) {
      console.log(`   ⚠️  发现 ${itemsWithNullEmbeddingButProcessed.length} 条 PROCESSED 文章 embedding 为 null`);
    }

    console.log('\n✅ 诊断完成！');

  } catch (error) {
    console.error('\n❌ 诊断失败:', error);
    process.exit(1);
  }
}

main();

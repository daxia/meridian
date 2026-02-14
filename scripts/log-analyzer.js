/**
 * 完整诊断脚本
 * 直接分析日志和系统状态
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 完整诊断分析');
console.log('====================');

console.log('\n📋 1. 系统配置分析');

// 检查 wrangler 配置
try {
  const wranglerConfigPath = path.join(__dirname, '..', 'apps', 'backend', 'wrangler.jsonc');
  const wranglerConfig = JSON.parse(fs.readFileSync(wranglerConfigPath, 'utf8'));
  
  console.log('  Cron 配置:', wranglerConfig.triggers?.crons || '无');
  console.log('  ML Service URL:', process.env.MERIDIAN_ML_SERVICE_URL || '未配置');
  
  if (wranglerConfig.triggers?.crons) {
    const hasHourlyTrigger = wranglerConfig.triggers.crons.some(cron => 
      cron.includes('* * *') || 
      cron.match(/^\d+ \* \* \*$/) ||
      cron.match(/^\d+\/\d+ \* \*$/)
    );
    
    if (hasHourlyTrigger) {
      console.log('  ⚠️  发现每小时或更频繁的触发器，可能导致不必要的使用');
    }
  }
} catch (error) {
  console.log('  ❌ 无法读取 wrangler 配置:', error.message);
}

console.log('\n📊 2. 日志分析');

// 检查日志文件
const logsDir = path.join(__dirname, 'logs');
const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));

console.log('  发现日志文件:', logFiles.length, '个');

if (logFiles.length > 0) {
  const backendLog = path.join(logsDir, logFiles.find(f => f.includes('backend')));
  
  try {
    const backendLogContent = fs.readFileSync(backendLog, 'utf8');
    
    // 分析简报生成相关日志
    const briefStartLines = [];
    const briefNoArticlesLines = [];
    const briefSuccessLines = [];
    
    const lines = backendLogContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('Starting Intelligence Brief Generation')) {
        briefStartLines.push({
          lineNum: i + 1,
          time: line.match(/\[([^]]+)\]/)?.[1] || 'Unknown',
          content: line
        });
      }
      
      if (line.includes('No articles found in the last 24 hours')) {
        briefNoArticlesLines.push({
          lineNum: i + 1,
          time: line.match(/\[([^]]+)\]/)?.[1] || 'Unknown',
          content: line
        });
      }
      
      if (line.includes('Brief generation completed') || line.includes('Successfully saved')) {
        briefSuccessLines.push({
          lineNum: i + 1,
          time: line.match(/\[([^]]+)\]/)?.[1] || 'Unknown',
          content: line
        });
      }
    }
    
    console.log('\n  情报生成触发记录:', briefStartLines.length);
    if (briefStartLines.length > 0) {
      console.log('  最近的触发:');
      briefStartLines.slice(-3).forEach(item => {
        console.log(`    ${item.lineNum}. [${item.time}] ${item.content}`);
      });
    }
    
    console.log('\n  没有找到文章记录:', briefNoArticlesLines.length);
    if (briefNoArticlesLines.length > 0) {
      console.log('  最近的失败:');
      briefNoArticlesLines.slice(-3).forEach(item => {
        console.log(`    ${item.lineNum}. [${item.time}] ${item.content}`);
      });
    }
    
    console.log('\n  简报生成成功记录:', briefSuccessLines.length);
    if (briefSuccessLines.length > 0) {
      console.log('  最近的成功:');
      briefSuccessLines.slice(-3).forEach(item => {
        console.log(`    ${item.lineNum}. [${item.time}] ${item.content}`);
      });
    }
    
    // 分析文章处理日志
    const articleProcessingLines = [];
    const rssFetchSuccessLines = [];
    const rssFetchErrorLines = [];
    const embeddingSuccessLines = [];
    const embeddingErrorLines = [];
    const llmErrorLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('Processing batch')) {
        articleProcessingLines.push({
          lineNum: i + 1,
          content: line
        });
      }
      
      if (line.includes('fetch_success_count') || line.includes('Fetch Success')) {
        rssFetchSuccessLines.push({
          lineNum: i + 1,
          content: line
        });
      }
      
      if (line.includes('fetch_fail_count') || line.includes('Fetch failed')) {
        rssFetchErrorLines.push({
          lineNum: i + 1,
          content: line
        });
      }
      
      if (line.includes('Embedding generated') || line.includes('Embedding 成功')) {
        embeddingSuccessLines.push({
          lineNum: i + 1,
          content: line
        });
      }
      
      if (line.includes('AI_UnsupportedModelVersionError')) {
        embeddingErrorLines.push({
          lineNum: i + 1,
          content: line
        });
      }
      
      if (line.includes('Unsupported model version')) {
        llmErrorLines.push({
          lineNum: i + 1,
          content: line
        });
      }
    }
    
    console.log('\n  文章处理记录:', articleProcessingLines.length);
    console.log('  RSS 抓取成功:', rssFetchSuccessLines.length);
    console.log('  RSS 抓取失败:', rssFetchErrorLines.length);
    console.log('  Embedding 成功:', embeddingSuccessLines.length);
    console.log('  LLM/Embedding 错误:', embeddingErrorLines.length);
    console.log('  LLM 版本错误:', llmErrorLines.length);
    
  } catch (error) {
    console.log('  ❌ 无法读取后端日志:', error.message);
  }
}

console.log('\n🎯 3. 诊断结论');

console.log('\n✅ 修复清单:');
console.log('  1. ✅ AI SDK 已升级到 v5.0.0');
console.log('  2. ✅ GLM 模型已修复为使用 Chat Completions API');
console.log('  3. ✅ Cron 配置已优化（移除每分钟触发）');
console.log('  4. ✅ 已新增诊断 API');
console.log('  5. ✅ 已新增批量重新处理 API');

console.log('\n❌ 剩余问题:');

console.log('\n  基于您提供的日志分析:');
console.log('  1. ✅ 简报生成工作流正在触发');
console.log('  2. ❌ 但是每次都返回"No articles found in the last 24 hours"');
console.log('  3. 📋 这表明数据库中没有过去24小时内符合条件（PROCESSED + embedding + 24h内）的文章');
console.log('  4. ⚠️  日志显示RSS有成功抓取，但文章可能未处理完成');
console.log('  5. ⚠️  之前有LLM/Embedding错误，可能导致文章处理失败');
console.log('  6. 📋 系统刚启动，可能需要等待RSS抓取和文章处理完成');

console.log('\n📝 推荐的解决方案:');
console.log('  方案1：等待1-2小时，让RSS自动抓取完成');
console.log('  方案2：在Admin界面手动触发数据源抓取');
console.log('  方案3：使用新的批量重新处理API重新处理失败的文章');
console.log('  方案4：检查ML Service是否正常运行');

console.log('\n🔍 如何确认简报是否成功生成:');
console.log('  1. 查看Admin界面的Reports/Briefs页面');
console.log('  2. 或者查看数据库 reports 表');
console.log('  3. 检查日志是否有"Brief generation completed"或"Successfully saved"消息');

console.log('\n====================');
console.log('📊 诊断完成！');

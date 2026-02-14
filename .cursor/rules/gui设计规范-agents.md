核心 GUI 设计规范组成部分

1. **[设计基本原则](https://www.google.com/search?q=%E8%AE%BE%E8%AE%A1%E5%9F%BA%E6%9C%AC%E5%8E%9F%E5%88%99&newwindow=1&sca_esv=3e8b06acf992d999&sxsrf=ANbL-n7zP4e8Mlvl43AoVbSwjEkztr4KuQ%3A1770689246932&ei=3pKKacK4OPugkPIP_5Wh8AQ&biw=2560&bih=1271&ved=2ahUKEwjCq8b1682SAxX4J0QIHRS4BGIQgK4QegQIAxAB&uact=5&oq=GUI%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83&gs_lp=Egxnd3Mtd2l6LXNlcnAiD0dVSeiuvuiuoeinhOiMgzIHEAAYgAQYDTIHEAAYgAQYDTIFEAAY7wUyCBAAGIAEGKIEMggQABiABBiiBDIFEAAY7wUyCBAAGAUYDRgeMggQABgFGA0YHjIIEAAYBRgNGB5IjipQuQRYnxRwAXgBkAEAmAGJA6AB9B6qAQQzLTExuAEDyAEA-AEBmAIHoAKoEcICChAAGLADGNYEGEfCAgQQIxgnwgIFEAAYgASYAwCIBgGQBgqSBwUxLjMtNqAHuCOyBwMzLTa4B6ERwgcFMC40LjPIBxeACAA&sclient=gws-wiz-serp&mstk=AUtExfBZWJNMIGIBL8Jd0zDP9PpWm_-fxZm_p6f0F_SME4n7t2oIWTvbI1UZWQT7Ej6vOrir0cgIZbUrGcDWLCgfHlr_aIe6SzGrRI2TO5O7NxCacQahzykNwlgbIslnCTH7I2L5s1oV_7i8Z2tb91jHEVh_ZsTpSja4S5tk9_63u4tZl4OmeGqQ4zczKKYCFGhxRVx_mKDhjyvvLv8-0Tvh4cGAcIBr8WqtYhWsdRjR2T9whMBgRe2ZxoB9o6hTVNtUl63RoDj9HiqeN9HgZ_8WxLfb&csui=3) (Four Basic Principles)**

   * **亲密性 (Proximity)** **：将相关联的元素组织在一起，减少杂乱。**
   * **对齐 (Alignment)** **：页面上的每个元素都应与另一元素存在视觉连接，确保整齐。**
   * **重复 (Repetition)** **：在整个设计中重复使用字体、颜色、形状等，以保持风格统一。**
   * **对比 (Contrast)** **：通过强调元素间的差异（大小、颜色、粗细）来凸显重点。**
2. **[视觉与品牌规范](https://www.google.com/search?q=%E8%A7%86%E8%A7%89%E4%B8%8E%E5%93%81%E7%89%8C%E8%A7%84%E8%8C%83&newwindow=1&sca_esv=3e8b06acf992d999&sxsrf=ANbL-n7zP4e8Mlvl43AoVbSwjEkztr4KuQ%3A1770689246932&ei=3pKKacK4OPugkPIP_5Wh8AQ&biw=2560&bih=1271&ved=2ahUKEwjCq8b1682SAxX4J0QIHRS4BGIQgK4QegQIAxAH&uact=5&oq=GUI%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83&gs_lp=Egxnd3Mtd2l6LXNlcnAiD0dVSeiuvuiuoeinhOiMgzIHEAAYgAQYDTIHEAAYgAQYDTIFEAAY7wUyCBAAGIAEGKIEMggQABiABBiiBDIFEAAY7wUyCBAAGAUYDRgeMggQABgFGA0YHjIIEAAYBRgNGB5IjipQuQRYnxRwAXgBkAEAmAGJA6AB9B6qAQQzLTExuAEDyAEA-AEBmAIHoAKoEcICChAAGLADGNYEGEfCAgQQIxgnwgIFEAAYgASYAwCIBgGQBgqSBwUxLjMtNqAHuCOyBwMzLTa4B6ERwgcFMC40LjPIBxeACAA&sclient=gws-wiz-serp&mstk=AUtExfBZWJNMIGIBL8Jd0zDP9PpWm_-fxZm_p6f0F_SME4n7t2oIWTvbI1UZWQT7Ej6vOrir0cgIZbUrGcDWLCgfHlr_aIe6SzGrRI2TO5O7NxCacQahzykNwlgbIslnCTH7I2L5s1oV_7i8Z2tb91jHEVh_ZsTpSja4S5tk9_63u4tZl4OmeGqQ4zczKKYCFGhxRVx_mKDhjyvvLv8-0Tvh4cGAcIBr8WqtYhWsdRjR2T9whMBgRe2ZxoB9o6hTVNtUl63RoDj9HiqeN9HgZ_8WxLfb&csui=3)**

   * **色彩系统** **：定义主色、辅色、辅助色（警示、成功、失败）以及色值，确保一致。**
   * **字体系统** **：定义字体类型、字号等级（标题、正文、说明）及行高，以提升可读性。**
   * **图标与图像** **：规范图标风格（线框、面性、彩色）和图标库。**
3. **[组件与组件库 (Components)](https://www.google.com/search?q=%E7%BB%84%E4%BB%B6%E4%B8%8E%E7%BB%84%E4%BB%B6%E5%BA%93+%28Components%29&newwindow=1&sca_esv=3e8b06acf992d999&sxsrf=ANbL-n7zP4e8Mlvl43AoVbSwjEkztr4KuQ%3A1770689246932&ei=3pKKacK4OPugkPIP_5Wh8AQ&biw=2560&bih=1271&ved=2ahUKEwjCq8b1682SAxX4J0QIHRS4BGIQgK4QegQIAxAM&uact=5&oq=GUI%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83&gs_lp=Egxnd3Mtd2l6LXNlcnAiD0dVSeiuvuiuoeinhOiMgzIHEAAYgAQYDTIHEAAYgAQYDTIFEAAY7wUyCBAAGIAEGKIEMggQABiABBiiBDIFEAAY7wUyCBAAGAUYDRgeMggQABgFGA0YHjIIEAAYBRgNGB5IjipQuQRYnxRwAXgBkAEAmAGJA6AB9B6qAQQzLTExuAEDyAEA-AEBmAIHoAKoEcICChAAGLADGNYEGEfCAgQQIxgnwgIFEAAYgASYAwCIBgGQBgqSBwUxLjMtNqAHuCOyBwMzLTa4B6ERwgcFMC40LjPIBxeACAA&sclient=gws-wiz-serp&mstk=AUtExfBZWJNMIGIBL8Jd0zDP9PpWm_-fxZm_p6f0F_SME4n7t2oIWTvbI1UZWQT7Ej6vOrir0cgIZbUrGcDWLCgfHlr_aIe6SzGrRI2TO5O7NxCacQahzykNwlgbIslnCTH7I2L5s1oV_7i8Z2tb91jHEVh_ZsTpSja4S5tk9_63u4tZl4OmeGqQ4zczKKYCFGhxRVx_mKDhjyvvLv8-0Tvh4cGAcIBr8WqtYhWsdRjR2T9whMBgRe2ZxoB9o6hTVNtUl63RoDj9HiqeN9HgZ_8WxLfb&csui=3)**

   * **通用控件** **：按钮（默认、悬停、点击）、输入框、复选框、单选按钮、开关、下拉菜单。**
   * **导航与布局** **：顶部导航、侧边栏、网格系统、列表设计。**
   * **交互反馈** **：弹窗、提示条（Toast）、加载样式。**
4. **[交互与动态效果 (Motion)](https://www.google.com/search?q=%E4%BA%A4%E4%BA%92%E4%B8%8E%E5%8A%A8%E6%80%81%E6%95%88%E6%9E%9C+%28Motion%29&newwindow=1&sca_esv=3e8b06acf992d999&sxsrf=ANbL-n7zP4e8Mlvl43AoVbSwjEkztr4KuQ%3A1770689246932&ei=3pKKacK4OPugkPIP_5Wh8AQ&biw=2560&bih=1271&ved=2ahUKEwjCq8b1682SAxX4J0QIHRS4BGIQgK4QegQIAxAR&uact=5&oq=GUI%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83&gs_lp=Egxnd3Mtd2l6LXNlcnAiD0dVSeiuvuiuoeinhOiMgzIHEAAYgAQYDTIHEAAYgAQYDTIFEAAY7wUyCBAAGIAEGKIEMggQABiABBiiBDIFEAAY7wUyCBAAGAUYDRgeMggQABgFGA0YHjIIEAAYBRgNGB5IjipQuQRYnxRwAXgBkAEAmAGJA6AB9B6qAQQzLTExuAEDyAEA-AEBmAIHoAKoEcICChAAGLADGNYEGEfCAgQQIxgnwgIFEAAYgASYAwCIBgGQBgqSBwUxLjMtNqAHuCOyBwMzLTa4B6ERwgcFMC40LjPIBxeACAA&sclient=gws-wiz-serp&mstk=AUtExfBZWJNMIGIBL8Jd0zDP9PpWm_-fxZm_p6f0F_SME4n7t2oIWTvbI1UZWQT7Ej6vOrir0cgIZbUrGcDWLCgfHlr_aIe6SzGrRI2TO5O7NxCacQahzykNwlgbIslnCTH7I2L5s1oV_7i8Z2tb91jHEVh_ZsTpSja4S5tk9_63u4tZl4OmeGqQ4zczKKYCFGhxRVx_mKDhjyvvLv8-0Tvh4cGAcIBr8WqtYhWsdRjR2T9whMBgRe2ZxoB9o6hTVNtUl63RoDj9HiqeN9HgZ_8WxLfb&csui=3)**

   * **交互逻辑** **：定义不同场景的点击行为，确保护理反馈直观（如使用符合物理定律的动画）。**
   * **缓动效果** **：明确动效的速度曲线，保证动画流畅、不突兀。**
5. **样式统一来源与配置**

   * **集中维护**：所有与 GUI 样式相关的配置（颜色、尺寸、QSS 模板等）统一在 `ui/src/config/fluent_settings.py` 中维护。
   * **统一使用**：各视图、组件应从 fluent_settings.py 导入 COLORS、UI、MATERIAL_STYLE 等配置使用，禁止在视图或组件内分散定义样式常量或硬编码 QSS。
   * **结构约定**：fluent_settings.py 中按「颜色（COLORS/MATERIAL_COLORS）」「界面尺寸（UI）」「样式模板（*_STYLE）」分层组织，样式模板通过占位符从颜色与尺寸配置取值，实现一处配置、统一样式。
   * **页面背景色设置**：子页面及内容区背景色须与当前主题一致。从 `ui/src/config/fluent_settings.py` 的 `FluentColors.get_background_color()` 获取背景色，`FluentColors.get_text_color()` 获取正文色。凡包含可滚动内容区的页面（如手动模式页、培养箱设置页），除根容器外，**QScrollArea 及其 viewport、内容区容器（如放置按钮/表格的 QWidget）均需显式设置相同背景色**，禁止留白（默认白色），以保持与设置规则一致。卡片等装饰性区域可使用 `FluentColors.get_card_color()`。

规范制定与应用建议

* **统一体验** **：通过组件库和原子设计思想，将设计规范与代码实现（如CSS变量）绑定。**
* **持续维护** **：设计规范非一成不变，需要根据用户体验数据和最新设计趋势（如拟物化、扁平化、玻璃拟态等）持续优化。**

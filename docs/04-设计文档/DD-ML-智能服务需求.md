# DD-ML-智能服务需求

## 1. 概述

本设计文档对应 `PRD-ML-智能服务需求.md`，负责 ML Service 的详细设计。

## 2. 变更记录

- 2026-02-14: 初始化，设计聚类接口。

---

## PRD-需求1：文章聚类接口 (待实现)

#### 需求编号：20260214007

### 概述

在 FastAPI 服务中新增 `/cluster` 端点，利用 `scikit-learn` 或 `hdbscan` 库实现向量聚类。

### 功能设计

1.  **库选型**: 使用 `sklearn.cluster.DBSCAN` 或 `HDBSCAN`。考虑到依赖体积，优先尝试 `sklearn`。
2.  **数据流**: 
    - 接收 Request Body (文章 ID + 向量)。
    - 转换向量为 NumPy Array。
    - 执行聚类。
    - 格式化输出。

### 接口与数据结构

#### POST `/cluster`

**Request**:
```json
{
  "articles": [
    { "id": 1, "embedding": [0.1, 0.2, ...] },
    { "id": 2, "embedding": [0.11, 0.21, ...] }
  ]
}
```

**Response**:
```json
{
  "clusters": [
    { "cluster_id": 0, "article_ids": [1, 2] },
    { "cluster_id": -1, "article_ids": [3] } // -1 表示噪声/未聚类
  ]
}
```

### 变更清单

| 文件 | 说明 |
| :--- | :--- |
| `services/meridian-ml-service/main.py` | 新增路由 |
| `services/meridian-ml-service/requirements.txt` | 新增 `scikit-learn` |
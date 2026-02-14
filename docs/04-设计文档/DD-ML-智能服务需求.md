# DD-ML-智能服务需求

## 1. 概述

本设计文档对应 `PRD-ML-智能服务需求.md`，负责 ML Service 的详细设计。

## 2. 变更记录

- 2026-02-14: 初始化，设计聚类接口。

---

## PRD-需求1：文章聚类接口 (已完成)

#### 需求编号：20260214007

### 概述

在 FastAPI 服务中新增 `/cluster` 端点，利用 `umap-learn` 和 `hdbscan` 库实现向量聚类。

### 功能设计

1.  **库选型**: 使用 `umap-learn` 进行降维，`hdbscan` 进行密度聚类。
2.  **数据流**: 
    - 接收 Request Body (Embeddings list)。
    - UMAP 降维至 5 维。
    - HDBSCAN 聚类。
    - 返回 Labels。

### 接口与数据结构

#### POST `/cluster`

**Request**:
```json
{
  "embeddings": [[0.1, ...], [0.2, ...]],
  "min_cluster_size": 5
}
```

**Response**:
```json
{
  "labels": [0, 0, 1, -1],
  "n_clusters": 2
}
```

### 变更清单

| 文件 | 说明 |
| :--- | :--- |
| `services/meridian-ml-service/main.py` | 新增路由 |
| `services/meridian-ml-service/requirements.txt` | 新增 `scikit-learn` |
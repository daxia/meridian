import numpy as np
from fastapi import Depends, FastAPI, HTTPException

from .config import settings
from .dependencies import (
    ModelDep,
    verify_token,
    get_embedding_model,
)  # Import auth dependency
from .embeddings import compute_embeddings
from .clustering import compute_clusters
from .schemas import EmbeddingRequest, EmbeddingResponse, ClusteringRequest, ClusteringResponse
from .logger import setup_logging

logger = setup_logging()

app = FastAPI(
    title="Meridian ML Service",
    description="Handles ML tasks like embeddings and clustering.",
    version="0.1.0",
)


# Simple root endpoint for health check
@app.get("/")
async def read_root():
    return {"status": "ok", "service": "Meridian ML Service"}


@app.get("/ping")
async def ping():
    return {"pong": True}


@app.post("/embeddings", response_model=EmbeddingResponse)
async def api_compute_embeddings(
    request: EmbeddingRequest,
    model_components: ModelDep,  # ModelDep already includes Depends
    _: None = Depends(verify_token),
):
    """
    Computes embeddings for the provided list of texts.
    """
    logger.info(f"收到嵌入请求，处理 {len(request.texts)} 条文本。")
    try:
        embeddings_np: np.ndarray = compute_embeddings(
            texts=request.texts,
            model_components=model_components,
        )

        embeddings_list: list[list[float]] = embeddings_np.tolist()

        return EmbeddingResponse(
            embeddings=embeddings_list, model_name=settings.embedding_model_name
        )
    except Exception as e:
        logger.error(f"嵌入计算错误: {e}", exc_info=True)
        # Consider more specific error handling based on exception types
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during embedding computation: {str(e)}",
        ) from e


@app.post("/cluster", response_model=ClusteringResponse)
async def api_cluster_embeddings(
    request: ClusteringRequest,
    _: None = Depends(verify_token),
):
    """
    Clusters the provided embeddings using UMAP + HDBSCAN.
    Returns the cluster labels and total number of clusters.
    """
    logger.info(f"收到聚类请求，处理 {len(request.embeddings)} 个向量。")
    try:
        labels = compute_clusters(
            embeddings=request.embeddings,
            min_cluster_size=request.min_cluster_size,
        )
        
        # Count unique clusters (excluding noise -1)
        unique_clusters = set(labels)
        if -1 in unique_clusters:
            unique_clusters.remove(-1)
        n_clusters = len(unique_clusters)
        
        return ClusteringResponse(labels=labels, n_clusters=n_clusters)
        
    except Exception as e:
        logger.error(f"聚类计算错误: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during clustering: {str(e)}",
        ) from e

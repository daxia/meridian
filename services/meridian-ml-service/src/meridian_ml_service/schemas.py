from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, description="List of texts to embed")


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]] = Field(
        ..., description="List of computed embeddings"
    )
    model_name: str = Field(..., description="Name of the model used")


class ClusteringRequest(BaseModel):
    embeddings: list[list[float]] = Field(..., description="List of embeddings to cluster")
    min_cluster_size: int = Field(5, description="Minimum size of clusters")


class ClusteringResponse(BaseModel):
    labels: list[int] = Field(..., description="Cluster labels for each input (-1 for noise)")
    n_clusters: int = Field(..., description="Number of clusters found")

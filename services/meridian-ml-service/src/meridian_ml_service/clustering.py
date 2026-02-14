import hdbscan
import umap
import numpy as np
from .logger import setup_logging

logger = setup_logging()

def compute_clusters(embeddings: list[list[float]], min_cluster_size: int = 5) -> list[int]:
    """
    Performs clustering on embeddings using UMAP reduction followed by HDBSCAN.
    Returns a list of cluster labels (-1 indicates noise).
    """
    if len(embeddings) < min_cluster_size:
        logger.warning(f"Not enough items for clustering. Count: {len(embeddings)}, Min: {min_cluster_size}")
        # If not enough items, return all as noise (-1) or single cluster (0)?
        # HDBSCAN needs at least min_cluster_size samples.
        # Let's return them all as noise for now, or maybe distinct clusters?
        # Standard HDBSCAN behavior would fail or return noise.
        # Let's just return -1 for all.
        return [-1] * len(embeddings)

    try:
        data = np.array(embeddings)
        
        # 1. Dimensionality Reduction with UMAP
        # We reduce to a lower dimension (e.g., 5) to help HDBSCAN work better
        # Use n_neighbors relative to dataset size but cap at 15
        n_neighbors = min(15, len(embeddings) - 1)
        if n_neighbors < 2: n_neighbors = 2
            
        reducer = umap.UMAP(
            n_neighbors=n_neighbors, 
            n_components=5, 
            metric='cosine',
            random_state=42 # Ensure reproducibility if possible
        )
        embedding_reduced = reducer.fit_transform(data)
        
        # 2. Clustering with HDBSCAN
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            metric='euclidean',
            cluster_selection_method='eom' # Excess of Mass
        )
        labels = clusterer.fit_predict(embedding_reduced)
        
        return labels.tolist()
        
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        raise e

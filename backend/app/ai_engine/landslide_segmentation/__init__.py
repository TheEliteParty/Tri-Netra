"""
Landslide Semantic Segmentation & Super-Resolution AI Engine
Ported and adapted from https://github.com/Eb3ls/landslides_segmentation
Integrates Sentinel-2 multispectral (RGB+NIR) 5x super-resolution with Attention-UNet semantic segmentation.
"""
from .spectral_preprocessor import SpectralPreprocessor
from .segmentation_model import LandslideSegmentationEngine, get_segmentation_engine

__all__ = ["SpectralPreprocessor", "LandslideSegmentationEngine", "get_segmentation_engine"]

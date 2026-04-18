import numpy as np
from typing import Dict, Any, List
from collections import defaultdict


class QualityMetrics:
    def __init__(self):
        self.metrics_history = defaultdict(list)

    def calculate_rouge_scores(self, generated: str, reference: str) -> Dict[str, float]:
        """计算ROUGE分数（简化版）"""
        # 这里使用简化的方法，实际应使用rouge-score库
        gen_words = set(generated.lower().split())
        ref_words = set(reference.lower().split())

        intersection = len(gen_words.intersection(ref_words))
        union = len(gen_words.union(ref_words))

        precision = intersection / len(gen_words) if gen_words else 0
        recall = intersection / len(ref_words) if ref_words else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            "rouge_precision": round(precision, 3),
            "rouge_recall": round(recall, 3),
            "rouge_f1": round(f1, 3)
        }

    def calculate_bleu_score(self, generated: str, reference: str) -> float:
        """计算BLEU分数（简化版）"""
        # 简化的BLEU计算
        gen_tokens = generated.lower().split()
        ref_tokens = reference.lower().split()

        # 1-gram精确度
        common = set(gen_tokens).intersection(set(ref_tokens))
        bleu = len(common) / len(gen_tokens) if gen_tokens else 0

        return round(bleu, 3)

    def calculate_coherence_score(self, summary: str) -> float:
        """计算连贯性分数"""
        sentences = summary.split('.')
        sentence_count = len([s for s in sentences if s.strip()])

        # 简单的连贯性检查：句子数量合理性
        if 3 <= sentence_count <= 10:  # 合理的摘要句子数
            coherence = 0.8
        elif 1 <= sentence_count <= 15:  # 宽松范围
            coherence = 0.6
        else:
            coherence = 0.3

        return round(coherence, 3)

    def evaluate_summary(self, generated_summary: str, reference_summary: str = None) -> Dict[str, Any]:
        """综合评估摘要质量"""
        metrics = {}

        # 基本统计
        metrics["length"] = len(generated_summary)
        metrics["word_count"] = len(generated_summary.split())
        metrics["sentence_count"] = len(generated_summary.split('.'))

        # 连贯性
        metrics["coherence_score"] = self.calculate_coherence_score(generated_summary)

        if reference_summary:
            # ROUGE分数
            rouge_scores = self.calculate_rouge_scores(generated_summary, reference_summary)
            metrics.update(rouge_scores)

            # BLEU分数
            metrics["bleu_score"] = self.calculate_bleu_score(generated_summary, reference_summary)

        # 综合质量分数
        if reference_summary:
            weights = {
                "rouge_f1": 0.4,
                "bleu_score": 0.3,
                "coherence_score": 0.3
            }
            overall_score = (
                    weights["rouge_f1"] * metrics["rouge_f1"] +
                    weights["bleu_score"] * metrics["bleu_score"] +
                    weights["coherence_score"] * metrics["coherence_score"]
            )
        else:
            # 没有参考摘要时的简化评分
            overall_score = (
                    0.5 * metrics["coherence_score"] +
                    0.3 * min(1.0, metrics["word_count"] / 300) +  # 长度适中
                    0.2 * min(1.0, metrics["sentence_count"] / 8)  # 句子数适中
            )

        metrics["overall_quality_score"] = round(overall_score, 3)

        # 记录历史
        for key, value in metrics.items():
            self.metrics_history[key].append(value)

        return metrics

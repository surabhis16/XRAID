# XRAID: eXplainable Robust Adaptive Intrusion Detection System

> **An adaptive hybrid ensemble framework for network intrusion detection using supervised, unsupervised, and deep reconstruction learning with SHAP explainability.**


## Key Features

- **Adaptive Ensemble Detection** - Combines Random Forest, Isolation Forest, and Autoencoder with confidence-based decision logic
- **99.57% Binary Accuracy** - Validated on CICIDS2017 with 100% precision and ROC-AUC of 0.9898
- **Multi-Class Categorization** - Identifies 9 attack types: DDoS, DoS, PortScan, BruteForce, WebAttack, Botnet, Infiltration, Exploit
- **SHAP Explainability** - Per-alert feature attributions for model transparency and analyst trust
- **Production-Ready Backend** - FastAPI + PostgreSQL with triggers, constraints, audit logs, and pre-built views
- **Real-Time Dashboard** - Next.js frontend with time-series analytics, alert management, and SHAP visualizations


## System Architecture

```mermaid
---
config:
  theme: default
  themeVariables:
    primaryColor: '#4A90E2'
    primaryTextColor: '#fff'
    primaryBorderColor: '#2E5C8A'
    lineColor: '#5C7CFA'
    secondaryColor: '#82C0CC'
    tertiaryColor: '#F4A261'
    background: '#F8F9FA'
    mainBkg: '#FFFFFF'
    secondBkg: '#E8F4F8'
---
flowchart TB
 subgraph subGraph0["<b>Data Ingestion</b>"]
        B["FastAPI Backend"]
        A["Network Traffic<br>CICIDS2017"]
        C["Feature Engineering<br>78 Features"]
  end
 subgraph subGraph1["<b>ML Pipeline</b>"]
        D["Random Forest<br>Binary Classifier"]
        E["Isolation Forest<br>Anomaly Detector"]
        F["Autoencoder<br>Reconstruction"]
        G{"Adaptive<br>Ensemble<br>Logic"}
        H["Multi-Class RF<br>9 Attack Types"]
        I["Label: Benign"]
  end
 subgraph subGraph2["<b>Explainability Layer</b>"]
        J["SHAP TreeExplainer<br>Feature Attribution"]
        K["Top 5 Features<br>+ Summary"]
  end
 subgraph subGraph3["<b>Persistence Layer</b>"]
        L[("PostgreSQL")]
        M["alerts"]
        N["network_flows"]
        O["shap_explanations"]
        P["alert_audit_log"]
        Q["Auto Severity<br>Calculation"]
        R["Audit Trail<br>Logging"]
        S["Dashboard<br>Aggregations"]
  end
 subgraph Frontend["<b>Frontend</b>"]
        T["Next.js Dashboard"]
        U["Alert Management & Analytics"]
        W["SHAP<br>Visualizations"]
  end
    A -- CSV Upload --> B
    B -- Preprocess --> C
    C --> D & E & F
    D -- "P_RF > 0.9" --> G
    E -- Anomaly Score --> G
    F -- Reconstruction<br>Error &gt; τ --> G
    G -- Attack Detected --> H
    G -- Benign --> I
    H --> J
    J --> K
    K --> L
    I --> L
    L -- Tables --> M & N & O & P
    L -- Triggers --> Q & R
    L -- Views --> S
    S --> T
    T --> U & W

    style B fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style A fill:#E8F4F8,stroke:#4A90E2,stroke-width:2px
    style G fill:#F4A261,stroke:#E07A3C,stroke-width:3px,color:#fff
    style J fill:#82C0CC,stroke:#5C9EA6,stroke-width:3px,color:#fff
    style L fill:#5C7CFA,stroke:#3B5BDB,stroke-width:3px,color:#fff
    style T fill:#37B679,stroke:#2D9561,stroke-width:3px,color:#fff
```

## Performance Metrics

| Model / Ensemble | Accuracy | Precision | Recall | ROC-AUC |
|------------------|----------|-----------|--------|---------|
| Random Forest | 99.85% | 99% | 100% | - |
| Isolation Forest | 79.22% | 39% | 10% | 0.74 |
| Autoencoder | 80.25% | 0% | 0% | 0.74 |
| **Adaptive Ensemble** | **99.57%** | **100%** | **98%** | **0.990** |

**Multi-Class Accuracy:** 99.55% across 9 attack categories

Unsupervised models underperform in standalone binary classification but provide complementary anomaly signals that improve ensemble robustness.

## Model Training

```bash
cd backend
python training.py
```

**Dataset:** CICIDS2017 (2.83M flows, 78 features, 9 attack types)  
**Models Generated:** RF (binary + multi-class), Isolation Forest, Autoencoder


## Database Schema

### Core Tables

- **alerts** : Central hub storing all detection events (prediction, confidence, status, severity)
- **network_flows** : Raw 78-feature CICIDS2017 flow data (JSONB)
- **shap_explanations** : SHAP values, top features, natural-language summary (JSONB)
- **alert_audit_log** : Immutable append-only audit trail

### Key Features

- **14 CHECK constraints** : Enforce confidence ranges, port numbers, enum domains
- **ON DELETE CASCADE** : Auto-cleanup of flow/SHAP records
- **3 Triggers** : Auto-update timestamp, auto-calculate severity, audit logging
- **11 B-Tree indexes** : Optimize timestamp/status/confidence queries
- **3 GIN indexes** : Accelerate JSONB containment queries
- **3 Pre-built Views** : Dashboard aggregations

## Adaptive Ensemble Logic

```python
# Confidence-based decision rules
if (rf_pred == 1 and if_pred == 1):
    return "Attack"  # High-confidence consensus
elif rf_proba > 0.9:
    return "Attack"  # RF very confident
elif (ae_error > threshold * 1.2) and (rf_pred == 0) and (if_pred == 0):
    return "Attack"  # Conservative AE override
else:
    return "Benign"
```

**Why Adaptive?**
- Trusts the strong RF+IF combination
- Allows Autoencoder to flag novel attacks only when very confident
- Avoids false positives from unsupervised models
- Outperforms fixed-weight and naive voting strategies

## SHAP Explainability

For each alert, XRAID computes:

1. **SHAP values** — Contribution of each of the 78 features to the prediction
2. **Top 5 features** — Ranked by absolute SHAP value with feature values
3. **Natural-language summary** — Human-readable explanation of the detection

## Tech Stack

**Backend:**
- FastAPI (async API)
- PostgreSQL (relational persistence)
- SQLAlchemy + Alembic (ORM + migrations)
- TensorFlow + Keras (Autoencoder)
- scikit-learn (RF, IF, preprocessing)
- SHAP (explainability)

**Frontend:**
- Next.js 13 
- TypeScript 
- Tailwind CSS 

## License

MIT License - see [LICENSE](LICENSE) for details

---
paths:
  - "ml/**"
---

# Python Rules — `ml/` (Xtrakto)

Standards for all Python code in the monorepo. They complement the project's general rules (`project-architecture-rules.md`).

**Scope:** in Xtrakto, Python **does not serve users**. It is used only in `ml/` to prepare data, train models, evaluate them and export them to ONNX. Production loads the ONNX file from TypeScript. That is why there are no routers, endpoints, repositories or caches here.

**How to read this:**

- **Always / Never** = mandatory.
- **Prefer / Avoid** = recommended; it can be broken with an explicit reason in the PR.

---

## Contents

1. [Tooling](#1-tooling)
2. [Structure of `ml/`](#2-structure-of-ml)
3. [Style and naming](#3-style-and-naming)
4. [Typing](#4-typing)
5. [Configuration and constants](#5-configuration-and-constants)
6. [Data](#6-data)
7. [Training and reproducibility](#7-training-and-reproducibility)
8. [Evaluation](#8-evaluation)
9. [ONNX export and the contract with TypeScript](#9-onnx-export-and-the-contract-with-typescript)
10. [Notebooks](#10-notebooks)
11. [Errors](#11-errors)
12. [Privacy](#12-privacy)
13. [Testing](#13-testing)
14. [Checklist before opening a PR](#14-checklist-before-opening-a-pr)

---

## 1. Tooling

| Purpose                      | Tool                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| Python version               | 3.12                                                                 |
| Environment and dependencies | **uv** (`pyproject.toml` + `uv.lock`)                                |
| Linting and formatting       | **ruff** (`ruff check` and `ruff format`)                            |
| Type checking                | **pyright** in `strict` mode                                         |
| Tests                        | **pytest**                                                           |
| Data                         | **pandas**                                                           |
| Models                       | **scikit-learn**; Hugging Face `transformers` only for the fine-tune |
| Experiments                  | **MLflow**                                                           |
| Export                       | **skl2onnx** and **onnxruntime** (for verification)                  |

- **Always** add dependencies with `uv add` and commit `uv.lock`. Never with a standalone `pip install`.
- **Always** run commands with `uv run` (`uv run pytest`, `uv run python -m ...`).
- `ml/` is **not** part of the pnpm workspace. Turborepo only runs it through scripts that call `uv`.

---

## 2. Structure of `ml/`

```text
ml/
├── pyproject.toml
├── uv.lock
├── README.md                     How to prepare data, train, evaluate and export
├── configs/                      Configuration for each training run (YAML, validated with Pydantic)
│   └── categorizer.v1.yaml
├── data/                         In .gitignore, never committed
│   ├── raw/                      Data as it arrives
│   ├── interim/                  Cleaned and anonymized
│   └── processed/                Ready for training, with its split
├── notebooks/                    Exploration only
├── src/xtrakto_ml/
│   ├── settings.py               Environment variables (Pydantic Settings)
│   ├── data/
│   │   ├── load.py
│   │   ├── clean.py
│   │   ├── anonymize.py
│   │   └── split.py
│   ├── features/
│   │   └── text_features.py
│   ├── models/
│   │   ├── categorizer/
│   │   │   ├── train.py          Entry point: python -m xtrakto_ml.models.categorizer.train
│   │   │   ├── evaluate.py
│   │   │   ├── baseline.py       Rule-based classifier used for comparison
│   │   │   └── categorizer_constants.py
│   │   └── anomaly/
│   ├── export/
│   │   └── to_onnx.py
│   └── utils/
├── tests/                        Mirrors src/xtrakto_ml/
└── artifacts/                    In .gitignore: local MLflow outputs
```

- **Always** organize by model inside `models/`. What two models share moves up to `data/`, `features/` or `utils/`.
- **Always** run each training script as a module (`python -m ...`) that receives the path to its config. No hard-coded values inside the script.
- Exported models used in production do **not** live in `ml/`. They are published to `packages/models/` (see section 9).

---

## 3. Style and naming

- **Always** follow PEP 8 through ruff. If ruff accepts it, the style is fine; formatting is not debated in PRs.
- **Modules and files:** `snake_case.py`. **Never** use dots in a module name: `auth_schemas.py`, not `auth.schemas.py`. Python cannot import a file with dots in its name.
- **Functions and variables:** `snake_case`. **Classes:** `PascalCase`. **Constants:** `UPPER_SNAKE_CASE`.
- **Descriptive names:** `train_categorizer`, not `run`; `transactions_df`, not `df2`.
- **Maximum 3 parameters.** With more, take a typed configuration object.
- **Prefer** functions over classes. Use a class only when there is state to keep or when it implements a `Protocol`.
- **Always** use `pathlib.Path` for paths, never concatenated strings.
- **Never** leave debugging `print`s; use `logging`.

### Function and file size

- **Always** a function does **one thing**. If you need an "and" to describe it ("loads the file **and** cleans the columns"), it is two functions.
- **Avoid** functions longer than **40 lines**. When a function reaches that size, check whether it mixes responsibilities and split it.
- **Avoid** more than **3 levels of indentation** inside a function. Use early returns or extract the inner block into another function.
- **Always** orchestrating functions (such as `train`) only call other functions in order; they don't contain the logic of each step.
- **Avoid** files longer than **300 lines of code**, not counting blank lines or comments. If a file goes over, split it by responsibility. Exceptions: tests, static data and generated code.
- **Always** keep lines to **88 characters** at most, ruff's default.

```python
# ❌ One function that loads, cleans, splits, trains and evaluates
def train(config_path: Path) -> None:
    ...  # 150 lines

# ✅ The main function orchestrates; each step is a function with a single responsibility
def train(config_path: Path) -> None:
    config = load_config(config_path)
    transactions = load_transactions(config.dataset_path)
    clean = clean_descriptions(transactions)
    split = split_by_statement(clean, seed=config.random_seed)
    model = fit_categorizer(split.train, config)
    report = evaluate(model, split.test)
    ensure_meets_threshold(report, config.min_macro_f1)
    log_run(config, model, report)
```

### SOLID, only where it helps

- **SRP:** loading, cleaning, splitting, training, evaluating and exporting are separate functions.
- **OCP / DIP:** if there are several interchangeable implementations (for example, the classic classifier and the fine-tune), define a `typing.Protocol` and make the evaluation code depend on it.

```python
from typing import Protocol

class CategoryPredictor(Protocol):
    def predict(self, descriptions: list[str]) -> list[str]: ...
```

Don't create base classes or abstraction layers "just in case". With two real implementations, yes; with one, no.

---

## 4. Typing

- **Always** type arguments, return values and attributes. pyright in `strict` mode must pass.
- **Always** use modern syntax: `list[str]`, `dict[str, int]`, `int | None`.
- **Never** use `Any` except at the boundary with an untyped library, with a comment justifying it.
- **Always** validate structures that come from outside with **Pydantic**: YAML configs and environment variables.
- **Prefer** `@dataclass(frozen=True)` for simple internal structures that don't need validation.

```python
# models/categorizer/categorizer_config.py
from pydantic import BaseModel, ConfigDict, Field

class CategorizerConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    dataset_path: str
    random_seed: int = 42
    test_size: float = Field(gt=0, lt=1, default=0.2)
    max_features: int = Field(gt=0, default=20_000)
    min_macro_f1: float = Field(gt=0, le=1)   # Threshold for accepting the model
```

---

## 5. Configuration and constants

### Environment variables

- **Always** load them with **Pydantic Settings** in `settings.py`. The script must not start if one is missing.
- **Never** put credentials, service URLs or machine-specific paths in code or in `*_constants.py`.
- **Never** commit `.env` with real values; only `.env.example`.

### Constants (`*_constants.py`)

- Only fixed values that don't change at runtime.
- **Always** in `UPPER_SNAKE_CASE` and annotated with `typing.Final`.
- **Prefer** `StrEnum` for closed sets of values.
- **Never** duplicate in Python a constant the TypeScript project already defines. **Spending categories** are defined once in `packages/core/categories.json`, and both Python and TypeScript read them from there.

```python
from typing import Final

DESCRIPTION_COLUMN: Final = "description"
LABEL_COLUMN: Final = "category"
MIN_SAMPLES_PER_CATEGORY: Final = 20
```

---

## 6. Data

- **Always** validate the schema on load: required columns, types and null values. If it doesn't match, fail with a clear message.
- **Always** reference columns through constants, never with strings repeated across the code.
- **Never** modify a DataFrame received as a parameter. Functions take a DataFrame and return a new one.
- **Always** represent amounts as integers in minor units (cents), the same as in TypeScript.
- **Always** normalize text with **exactly the same logic** as `normalizeDescription` in `packages/parsers`. If it changes on one side, it changes on the other, and the parity test (section 9) verifies it.

### Splitting the data (the most important thing to avoid fooling yourself)

- **Never** split train/test by random row. Transactions from the same statement are very similar to each other, and if they end up on both sides the metrics are inflated.
- **Always** split by **statement** (or by user once there are multiple users), using `GroupShuffleSplit` or similar.
- **Prefer** a time-based split as well: train on earlier months and evaluate on the most recent ones.
- **Always** fix the seed and save the resulting split in `data/processed/` so every experiment uses the same one.
- **Never** look at the test set while tuning the model. That is what the validation set is for.

---

## 7. Training and reproducibility

- **Always** fix the seeds (`random`, `numpy`, the model's) from the config.
- **Always** log every training run to **MLflow** with: the full config, the dataset hash, the git commit, the metrics and the resulting model.
- **Always** put preprocessing **inside** the scikit-learn `Pipeline` (vectorizer + model). That way it is exported together with the model and doesn't have to be reimplemented in TypeScript.
- **Never** train on data that isn't in `data/processed/` and versioned by hash.
- A new model only replaces the previous one if it improves on its metrics on the same test set.

---

## 8. Evaluation

- **Always** compare against the rule-based **baseline** (`baseline.py`). If the model doesn't beat it, it isn't used.
- **Always** report metrics per category, not just the average: precision, recall and F1 per class, macro F1 and the confusion matrix.
- **Always** also report **coverage**: the percentage of transactions the model classifies with confidence above the threshold, and that therefore don't need an LLM call.
- **Always** define the minimum threshold (`min_macro_f1`) in the config. If the model doesn't reach it, the script exits with an error and doesn't export.
- **Always** document the accepted model's results in `docs/models/<model>.md`: data used, metrics, known limitations and date.

---

## 9. ONNX export and the contract with TypeScript

The model is a contract between two languages. These rules prevent it from working in Python and failing in production.

- **Always** export with `export/to_onnx.py` to `packages/models/<model>/<version>/`, which contains:
  - `model.onnx`
  - `manifest.json`: version, date, commit, input and output names and types, label order, recommended confidence threshold and metrics.
  - `golden.json`: about 50 example inputs with their expected predictions.
- **Always** verify after exporting that `onnxruntime` in Python gives the same predictions as the original model on `golden.json`.
- **Always** keep a TypeScript test that loads `model.onnx` with `onnxruntime-node`, runs `golden.json` and compares. This is the **parity test**: if it fails, the model is not published.
- **Never** overwrite a published version. A new model is a new version folder, and production switches versions with an explicit commit.
- **Always** check that every step in the `Pipeline` can be converted by skl2onnx before choosing it. A non-convertible step forces logic to be reimplemented in TypeScript, which is exactly what we want to avoid.

---

## 10. Notebooks

- **Exploration only.** No production script or model depends on a notebook.
- **Always** move a cell that turns out to be useful into a function in `src/` with its test.
- **Always** clear outputs before committing (`nbstripout`). Outputs can contain data.
- **Naming:** `NN-short-description.ipynb` (`01-explore-descriptions.ipynb`).

---

## 11. Errors

- **Never** use a bare `except:` or `except Exception: pass`.
- **Always** catch the most specific exception possible and re-raise it with context (`raise ... from err`) if you can't handle it.
- **Always** define custom exceptions for expected domain errors in `errors.py` (`InvalidDatasetError`, `ModelBelowThresholdError`).
- A failing script **always** exits with a non-zero code, so CI detects it.

---

## 12. Privacy

- **Never** commit real data to the repository. `data/` and `artifacts/` are in `.gitignore`.
- **Always** anonymize before moving data to `interim/`: remove names, ID numbers, account numbers and phone numbers from descriptions (`anonymize.py`, with tests).
- **Never** record real descriptions containing personal data in MLflow, logs or `golden.json`. `golden.json` uses synthetic or anonymized descriptions.
- **Never** upload data that hasn't been anonymized to an external service (including a remote MLflow).

---

## 13. Testing

- **pytest**, with tests in `tests/` mirroring the structure of `src/xtrakto_ml/`.
- **Required** tests for: cleaning, anonymization, data splitting (including that no statement ends up on both sides), text normalization and export.
- **Always** use small, synthetic datasets in tests. A test must not train a real model or take more than a few seconds.
- **Always** test anonymization with real-world formats (phone numbers, ID numbers, truncated names), not just the happy path.
- CI runs `ruff check`, `ruff format --check`, `pyright` and `pytest` whenever something in `ml/` changes.

---

## 14. Checklist before opening a PR

- [ ] `uv run ruff check`, `uv run ruff format --check`, `uv run pyright` and `uv run pytest` pass.
- [ ] No unjustified `Any`, debugging `print`s or generic `except`.
- [ ] No new function exceeds 40 lines and no file exceeds 300, except the allowed exceptions.
- [ ] No configuration value is hard-coded in a script.
- [ ] The split is by statement or user, with a fixed seed.
- [ ] The model beats the baseline and the config's threshold.
- [ ] The training run was logged to MLflow.
- [ ] If a model was exported: new version, `manifest.json`, `golden.json` and a passing parity test.
- [ ] No real data is committed, neither in files nor in notebook outputs.

# Bestiary load data

The CSVs `029-seed-bestiary.yaml` loads, and the two scripts that produce them
from the SRD 5.2.1 PDF.

Keep the scripts with the data. The CSVs are generated, and the only way to
review a correction to one of them — or to re-derive the lot when the book is
revised — is to be able to run the thing that wrote them.

## Regenerating

```
curl -o srd521.pdf https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
for p in $(seq 258 364); do
  pdftotext -layout -f $p -l $p -x 0   -y 0 -W 300 -H 783 srd521.pdf - >> mon521full.txt
  pdftotext -layout -f $p -l $p -x 300 -y 0 -W 294 -H 783 srd521.pdf - >> mon521full.txt
done
python3 parse-bestiary.py   # -> bestiary.json
python3 emit-bestiary.py    # -> the CSVs beside this file
```

Two columns must be extracted separately: `pdftotext -layout` interleaves them
and the result is unparseable.

Ids are UUIDv5 of the creature's name, so a re-run is byte-identical and a
parser fix shows up as a diff on the rows it touched rather than as 3,000 new
ids. **Changing a CSV after the changeset has been applied anywhere will fail
Liquibase's checksum** — correct data in a new changeset instead.

## Coverage, measured against the source text

| | in the book | parsed |
|---|---|---|
| stat blocks | 330 | 330 |
| `Attack Roll:` | 423 | 421 |
| `Saving Throw: DC` | 200 | 187 |
| `(Recharge N-N)` | 87 | 86 |
| `(N/Day)` | 60 | 59 |
| `Success: Half damage` | 80 | 80 |
| `has the X condition` | 222 | 210 |
| Skills / Senses / Gear / Immunities lines | all | all |

The shortfall is features carrying a *second* save or condition clause, where
only the first becomes the feature's structured delivery. Nothing is lost: every
feature keeps the book's sentence in `description`, and an effect keeps anything
the columns couldn't hold in `notes`.

import { CATEGORY_NAME, moveAccuracy, movePower, type MoveDef } from "@/data/pokemon/moves";
import { TYPE_COLOR, TYPE_NAME } from "@/data/pokemon/types";

export function MoveDetails({ definition, pp, description = true }: { definition: MoveDef; pp: number; description?: boolean }) {
  return (
    <section className="move-details" aria-label={`Detalhes de ${definition.name}`}>
      <div className="move-tags">
        <b style={{ backgroundColor: TYPE_COLOR[definition.type] }}>{TYPE_NAME[definition.type]}</b>
        <span data-category={definition.category}>{CATEGORY_NAME[definition.category]}</span>
      </div>
      <dl className="move-stats">
        <div><dt>Potência</dt><dd>{movePower(definition)}</dd></div>
        <div><dt>Precisão</dt><dd>{moveAccuracy(definition)}</dd></div>
        <div><dt>PP</dt><dd>{pp}/{definition.pp}</dd></div>
      </dl>
      {description ? <p className="move-description">{definition.description}</p> : null}
    </section>
  );
}

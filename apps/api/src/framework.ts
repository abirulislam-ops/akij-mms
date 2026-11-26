import { db, schema } from "./db.js";

export async function getFramework() {
  const dimensions = await db.select().from(schema.dimension).orderBy(schema.dimension.sortOrder);
  const kpis = await db
    .select({
      code: schema.kpiDefinition.code,
      name: schema.kpiDefinition.name,
      dimensionId: schema.kpiDefinition.dimensionId,
      definition: schema.kpiDefinition.definition,
      formula: schema.kpiDefinition.formula,
      unit: schema.kpiDefinition.unit,
      direction: schema.kpiDefinition.direction,
      leading: schema.kpiDefinition.leading,
      core: schema.kpiDefinition.core,
      measurementMethod: schema.kpiDefinition.measurementMethod,
      frequency: schema.kpiDefinition.frequency,
      ownerRole: schema.kpiDefinition.ownerRole,
    })
    .from(schema.kpiDefinition)
    .orderBy(schema.kpiDefinition.dimensionId, schema.kpiDefinition.name);

  const indices = [
    { id: "BEI", name: "Brand Equity Index", dims: ["d1"], note: "Accumulated intangible strength." },
    { id: "BHI", name: "Brand Health Index", dims: ["d2", "d3", "d6"], note: "Current perception & competitive health." },
    { id: "BPI", name: "Brand Performance Index", dims: ["d4", "d5", "d7"], note: "Commercial & marketing effectiveness." },
    { id: "Composite", name: "Composite Brand Score", dims: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"], note: "All 7 dimensions, weighted." },
  ];

  return { dimensions, kpis, indices };
}

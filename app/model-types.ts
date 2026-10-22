export type Benchmark={name:string;score:string;setup:string;attribution:'Vendor-reported'|'Independent';source:string};
export type Price={input:number|null;output:number|null;note:string;source:string};
export type ModelResearch={id:string;name:string;provider:string;releaseDate:string|null;releaseLabel:string;releaseSource:string;summary:string;benchmarks:Benchmark[];officialPrice:Price|null;contextWindow:number|null;researchCheckedAt:string};
export type ModelRow=ModelResearch&{catalogCreatedAt?:string;catalogCheckedAt?:string;routerPrice?:Price;routerContextWindow?:number|null;routerAvailable?:boolean;lastChangeAt?:string;change?:string;previousRouterPrice?:Price};
export type ModelSnapshot={updatedAt:string|null;catalogCheckedAt:string|null;researchCheckedAt:string|null;records:ModelRow[];changes:{id:string;name:string;type:string;at:string}[]};

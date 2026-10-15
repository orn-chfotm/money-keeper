---
name: dto-contracts
description: "money-keeper의 TypeScript 함수 작성·수정 시 RequestDto 객체 입력과 ResponseDto 출력 계약을 적용하고 호출부를 검증한다. PA의 함수 구현 및 DTO 리팩터링 작업에 사용한다."
---

# DTO 계약 적용

구현 전에 [DTO 함수 계약 rule](../../rules/05-dto-contracts.md)을 Read로 읽는다. 적용 범위와 예외의 단일 기준은 해당 rule이다.

## 작업 절차

1. 작업 대상 함수와 호출부, 기존 DTO 및 런타임 검증 스키마를 확인한다. 기존 HTTP 계약과 함수 내부 계약을 구분한다.
2. 해당 도메인의 기존 타입 파일을 우선 활용해 `XxxRequestDto`, `XxxResponseDto`를 객체 형태의 `type` 또는 `interface`로 정의한다. 둘 다 허용하며 주변 코드의 관례를 따른다. 새 타입 파일은 승인된 작업 경계 안에서만 만든다.
3. 입력 객체 하나와 명시적 반환 타입으로 구현하고 호출부를 함께 수정한다. 비동기 결과는 `Promise<XxxResponseDto>`로 선언한다.
4. 외부 요청은 기존 Zod 검증을 유지하고, 검증된 값에서 DTO를 구성한다. JSON에 `as XxxResponseDto`를 붙이는 것을 런타임 검증으로 취급하지 않는다.
5. 기존 API 응답 형식은 어댑터에서 보존한다. 내부 DTO 변경만을 이유로 204 응답에 본문을 추가하거나 공개 API 구조를 바꾸지 않는다.
6. 변경 계층의 타입 검사와 관련 기존 테스트를 수행한다. 검증하지 못한 항목은 이유를 명시한다. reviewer에게 변경 시그니처, 호출부 반영, 적용한 예외와 검증 결과를 전달한다.

## 예시: interface와 동기 함수

```ts
interface CalculateBalanceRequestDto {
  income: number;
  expense: number;
}

interface CalculateBalanceResponseDto {
  balance: number;
}

function calculateBalance(
  param: CalculateBalanceRequestDto,
): CalculateBalanceResponseDto {
  return { balance: param.income - param.expense };
}

const { balance } = calculateBalance({ income: 100_000, expense: 30_000 });
```

## 예시: type과 비동기 함수

아래 `declare`는 저장소에서 제공한다고 가정한 함수 계약이다. 실제 구현에서는 해당 함수를 import한다. 예시의 조회 항목은 설명을 위해 필드를 축약했다.

```ts
type RecordDto = {
  id: number;
  amount: number;
};

type ListRecordsRequestDto = {
  from: string;
  to: string;
};

type ListRecordsResponseDto = {
  items: RecordDto[];
};

declare function findRecordsByDateRange(
  request: ListRecordsRequestDto,
): Promise<ListRecordsResponseDto>;

async function listRecords(
  { from, to }: ListRecordsRequestDto,
): Promise<ListRecordsResponseDto> {
  return findRecordsByDateRange({ from, to });
}

const recordsResult: Promise<ListRecordsResponseDto> = listRecords({
  from: "2026-10-01",
  to: "2026-10-31",
});
```

이 예시는 저장소가 이미 공개 가능한 DTO로 변환한 결과를 반환하므로 계약을 재사용한다. 저장소가 DB 행을 반환하는 실제 코드에서는 API 경계에서 응답 DTO로 변환한다.

## 예시: 결과 없는 명령

```ts
type DeleteRecordRequestDto = { id: number };

// 허용: 결과 없는 명령의 void 반환. 실제 구현은 저장소 삭제를 호출한다.
declare function deleteRecord(request: DeleteRecordRequestDto): Promise<void>;

deleteRecord({ id: 1 });
```

## [금지사항]

아래는 [DTO 함수 계약 rule](../../rules/05-dto-contracts.md)의 위반 사례다. 구현 전과 완료 전에 반드시 확인한다. `type`과 `interface`는 모두 허용되며, 결과 없는 명령의 `void` 반환은 허용된 예외다.

- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- 작업 범위 내 위반은 함수와 호출부·관련 테스트를 함께 수정하고 타입 검사 및 관련 테스트로 재검증한다. 범위 밖 수정이 필요하면 PL에 위반 위치·이유·필요 범위를 보고하고 해당 작업을 보류한다. TODO나 경고만 남긴 채 완료 처리하지 않는다.
- 여러 위치 인자, 원시값 DTO, 인라인 입력 타입으로 계약을 대체하지 않는다.
- 필수 필드를 누락하거나 필드 타입이 다른 객체를 전달하지 않는다.
- 응답 DTO 대신 원시값·배열을 직접 반환하거나 반환 타입 명시를 생략하지 않는다.
- `any`·타입 단언·오류 억제 주석으로 실제 앱의 DTO 계약 위반을 숨기지 않는다.
- 예시의 `declare`를 실제 저장소 구현으로 간주하거나 오류 예시를 앱 실행 코드에 복사하지 않는다.

```ts
// 금지: 여러 위치 인자와 배열 직접 반환
// function listRecords(from: string, to: string): Promise<RecordDto[]>

// 금지: 이름만 DTO이고 실제로는 원시값인 타입
// type DeleteRecordRequestDto = number;

// 금지: 입력 타입을 함수 안에 인라인으로 선언
// function deleteRecord({ id }: { id: number }): Promise<void>

// 다음 호출들은 TypeScript 검사에서 실패해야 한다.
// @ts-expect-error 원시값 인자 금지
deleteRecord(1);
// @ts-expect-error 필드 타입 불일치
deleteRecord({ id: "1" });
// @ts-expect-error 필수 필드 누락
listRecords({ from: "2026-10-01" });
// @ts-expect-error 응답 DTO 대신 원시값 반환 금지
const invalidResponse: CalculateBalanceResponseDto = 70_000;
```

위 `@ts-expect-error`는 예시 검증에서 예상 오류 발생을 확인하기 위한 용도로만 사용한다. 실제 구현의 타입 오류를 우회하는 용도로 사용하지 않는다.

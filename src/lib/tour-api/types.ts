// TourAPI(KorService2) 원본 응답 타입. 실제 필드명(mapx/mapy/contentid 등)을 그대로 따른다.

export interface TourApiRawItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapx?: string; // 경도(longitude)
  mapy?: string; // 위도(latitude)
  firstimage?: string;
  firstimage2?: string;
  dist?: string; // locationBasedList2에서만 제공되는 거리(m)
  tel?: string;
  overview?: string;
}

export interface TourApiDetailIntroItem {
  contentid: string;
  contenttypeid: string;
  usetime?: string;
  usetimeculture?: string;
  opentimefood?: string;
  restdatefood?: string;
  [key: string]: string | undefined;
}

export interface TourApiImageItem {
  contentid: string;
  originimgurl: string;
  smallimageurl: string;
}

export interface TourApiResponse<T> {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: T[] | T } | "";
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
    };
  };
}

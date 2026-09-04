"use client";

import { ArrowLeftOutlined, CarOutlined, EnvironmentOutlined, PlusOutlined, ShopOutlined } from "@ant-design/icons";
import { Button, Modal, Skeleton, Tag, message } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import {
  cancelPublicGameSessionJoin,
  getPublicGameSession,
  joinPublicGameSession,
  type PublicGameSession,
} from "@/lib/player-h5/player-public-api";
import { formatPrice, formatSessionDateLine } from "./mobile-format";
import styles from "./player-mobile-shell.module.css";

export function PlayerSessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PublicGameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      getPublicGameSession(sessionId)
        .then(setSession)
        .catch((reason) => setError(reason instanceof Error ? reason.message : "场次详情加载失败"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionId]);

  const reserved = session?.myReservationStatus === "confirmed" || session?.myReservationStatus === "pending";

  const joinSession = async () => {
    if (!session || joining) return;
    if (!user) {
      messageApi.info("请先登录，登录成功后会自动为你上车");
      const next = `${window.location.pathname}${window.location.search ? `${window.location.search}&autoJoin=1` : "?autoJoin=1"}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setJoining(true);
    try {
      const nextSession = await joinPublicGameSession(session.id);
      setSession(nextSession);
      messageApi.success(nextSession.myReservationCode ? `上车成功，预约码 ${nextSession.myReservationCode}` : "上车成功");
      if (searchParams.get("autoJoin")) {
        const clean = new URL(window.location.href);
        clean.searchParams.delete("autoJoin");
        router.replace(`${clean.pathname}${clean.search}`);
      }
    } catch (reason) {
      messageApi.error(reason instanceof Error ? reason.message : "上车失败，请稍后再试");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !session || reserved || searchParams.get("autoJoin") !== "1") return;
    const timer = window.setTimeout(() => {
      void joinSession();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, session?.id, reserved, searchParams]);

  const cancelJoin = () => {
    if (!session || joining) return;
    modalApi.confirm({
      title: "确认取消约车？",
      content: "取消后会释放你的车位；如果之后还想玩，需要重新点击上车。",
      okText: "确认取消",
      okButtonProps: { danger: true },
      cancelText: "我再想想",
      onOk: async () => {
        setJoining(true);
        try {
          const nextSession = await cancelPublicGameSessionJoin(session.id);
          setSession(nextSession);
          messageApi.success("约车已取消");
        } catch (reason) {
          messageApi.error(reason instanceof Error ? reason.message : "取消失败，请稍后再试");
        } finally {
          setJoining(false);
        }
      },
    });
  };

  if (loading) return <Skeleton active />;
  if (error || !session) return <div className={styles.empty}>{error || "场次不存在"}</div>;

  const remainingSeats = Math.max(session.capacity - session.joinedSeats, 0);
  const cover = session.coverImageUrl;
  const detailImages = session.detailImageUrls ?? [];

  return (
    <div className={styles.sessionDetailPage}>
      {contextHolder}
      {modalContextHolder}
      <section className={styles.sessionDetailHero}>
        {cover ? <img src={cover} alt={session.title || session.scriptName} /> : null}
        <div className={styles.sessionDetailMask} />
        <Link href="/p/sessions" className={styles.heroBack}><ArrowLeftOutlined /></Link>
        <div className={styles.sessionDetailIntro}>
          <div className={styles.detailPoster}>
            {cover ? <img src={cover} alt={session.scriptName} /> : <span>{session.scriptName.slice(0, 2)}</span>}
          </div>
          <div>
            <div className={styles.detailTitleLine}>
              <Tag color="red">城限</Tag>
              <h1>{session.title || session.scriptName}</h1>
            </div>
            <p>剧本 · 组局 · {Math.round(session.durationMinutes / 60)}小时 · 进阶</p>
            <strong>{formatPrice(session.priceCents)}</strong>
          </div>
        </div>
        <div className={styles.sessionBadgeBar}>
          <span>完成组局可点亮「{session.scriptName}」勋章</span>
          <b>{session.joinedSeats}/{session.capacity}人</b>
        </div>
      </section>

      <section className={styles.storePanel}>
        <div className={styles.storeLine}>
          <span className={styles.storeLogo}>ti</span>
          <div>
            <strong><ShopOutlined /> T.I推理空间</strong>
            <p><EnvironmentOutlined /> 门店地址待完善</p>
          </div>
          <em>同城</em>
        </div>
        <div className={styles.seatPanel}>
          <div>
            <span>开始时间</span>
            <strong>{formatSessionDateLine(session.startTime)}</strong>
          </div>
          <div>
            <span>空余车位</span>
            <strong>{remainingSeats > 0 ? `等${remainingSeats}人` : "已满"}</strong>
          </div>
          <div className={styles.seatAvatars}>
            {Array.from({ length: Math.min(session.joinedSeats, 5) }).map((_, index) => (
              <i key={index}>{index + 1}</i>
            ))}
            {remainingSeats > 0 ? <button type="button"><PlusOutlined /><small>邀请</small></button> : null}
          </div>
        </div>
      </section>

      <section className={styles.detailSection}>
        <h2>剧本介绍</h2>
        <p>{session.description || "这个场次还没有填写详细介绍，可以先咨询 AI 客服了解适合人群、玩法风格和拼车情况。"}</p>
      </section>

      {detailImages.length ? (
        <section className={styles.detailSection}>
          <h2>详情图</h2>
          <div className={styles.commodityImages}>
            {detailImages.map((url) => (
              <img key={url} src={url} alt={`${session.scriptName} 详情图`} />
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.bookingBar}>
        <strong>{formatPrice(session.priceCents).replace("/人", "")}</strong>
        <Button
          type="primary"
          size="large"
          danger={reserved}
          icon={<CarOutlined />}
          loading={joining || authLoading}
          disabled={!reserved && remainingSeats <= 0}
          onClick={reserved ? cancelJoin : joinSession}
        >
          {reserved ? "取消约车" : remainingSeats > 0 ? "立即上车" : "已满员"}
        </Button>
      </div>
    </div>
  );
}

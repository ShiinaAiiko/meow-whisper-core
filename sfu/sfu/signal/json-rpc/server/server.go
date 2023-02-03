package server

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/go-logr/logr"
	log "github.com/pion/ion-sfu/pkg/logger"
	"github.com/pion/ion-sfu/pkg/sfu"
	"github.com/pion/webrtc/v3"
	"github.com/sourcegraph/jsonrpc2"
)

var (
	logger = log.New()
)

// Join message sent when initializing a peer connection
type Join struct {
	SID    string                    `json:"sid"`
	UID    string                    `json:"uid"`
	Offer  webrtc.SessionDescription `json:"offer"`
	Config sfu.JoinConfig            `json:"config"`
}

// Negotiation message sent when renegotiating the peer connection
type Negotiation struct {
	Desc webrtc.SessionDescription `json:"desc"`
}

// Trickle message sent when renegotiating the peer connection
type Trickle struct {
	Target    int                     `json:"target"`
	Candidate webrtc.ICECandidateInit `json:"candidate"`
}

type JSONSignal struct {
	*sfu.PeerLocal
	logr.Logger
}

func NewJSONSignal(p *sfu.PeerLocal, l logr.Logger) *JSONSignal {
	return &JSONSignal{p, l}
}

// Handle incoming RPC call events like join, answer, offer and trickle
func (p *JSONSignal) Handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) {
	// fmt.Println("req", req)
	replyError := func(err error) {
		_ = conn.ReplyWithError(ctx, req.ID, &jsonrpc2.Error{
			Code:    500,
			Message: fmt.Sprintf("%s", err),
		})
	}

	switch req.Method {
	case "join":
		logger.Info("JOIN API", "TIP", "===============API===============")

		var join Join
		err := json.Unmarshal(*req.Params, &join)
		if err != nil {
			p.Logger.Error(err, "connect: error parsing offer")
			replyError(err)
			break
		}
		// fmt.Println("join", join)

		p.OnOffer = func(offer *webrtc.SessionDescription) {
			if err := conn.Notify(ctx, "offer", offer); err != nil {
				p.Logger.Error(err, "error sending offer")
			}

		}
		p.OnIceCandidate = func(candidate *webrtc.ICECandidateInit, target int) {
			if err := conn.Notify(ctx, "trickle", Trickle{
				Candidate: *candidate,
				Target:    target,
			}); err != nil {
				p.Logger.Error(err, "error sending ice candidate")
			}
		}

		err = p.Join(join.SID, join.UID, join.Config)
		if err != nil {
			p.Logger.Error(err, "p.Join line 77")
			replyError(err)
			break
		}

		answer, err := p.Answer(join.Offer)
		if err != nil {
			p.Logger.Error(err, "p.Answer line 86")
			replyError(err)
			break
		}

		_ = conn.Reply(ctx, req.ID, answer)

	case "offer":
		logger.Info("OFFER API", "TIP", "===============API===============")
		var negotiation Negotiation
		err := json.Unmarshal(*req.Params, &negotiation)
		if err != nil {
			p.Logger.Error(err, "connect: error parsing offer")
			replyError(err)
			break
		}

		// fmt.Println("negotiation.Desc", negotiation)
		// fmt.Println("negotiation.Desc", negotiation.Desc)

		answer, err := p.Answer(negotiation.Desc)
		if err != nil {
			p.Logger.Error(err, "p.Answer line 104")
			replyError(err)
			break
		}
		_ = conn.Reply(ctx, req.ID, answer)

	case "answer":
		logger.Info("ANSWER API", "TIP", "===============API===============")
		var negotiation Negotiation
		err := json.Unmarshal(*req.Params, &negotiation)
		if err != nil {
			p.Logger.Error(err, "connect: error parsing answer")
			replyError(err)
			break
		}

		err = p.SetRemoteDescription(negotiation.Desc)
		if err != nil {
			p.Logger.Error(err, "p.SetRemoteDescription line 121")
			replyError(err)
		}

	case "trickle":
		logger.Info("TRICKLE API", "TIP", "===============API===============")
		var trickle Trickle
		err := json.Unmarshal(*req.Params, &trickle)
		if err != nil {
			p.Logger.Error(err, "connect: error parsing candidate")
			replyError(err)
			break
		}

		fmt.Println("trickle", trickle)

		err = p.Trickle(trickle.Candidate, trickle.Target)
		if err != nil {
			p.Logger.Error(err, "p.SetRemoteDescription line 136")
			replyError(err)
		}
	}
}

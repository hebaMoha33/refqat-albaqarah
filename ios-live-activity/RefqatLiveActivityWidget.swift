import ActivityKit
import SwiftUI
import WidgetKit


struct RefqatLiveActivityWidget: Widget {

    var body: some WidgetConfiguration {

        ActivityConfiguration(
            for: RefqatLiveActivityAttributes.self
        ) { context in

            /*
             =====================================
             LOCK SCREEN / BANNER
             =====================================
            */

            VStack(
                alignment: .leading,
                spacing: 12
            ) {

                HStack {

                    Text("🌅")

                    Text(
                        context.attributes.title
                    )
                    .font(
                        .headline
                    )

                    Spacer()

                    Text(
                        "\(Int(context.state.progress))%"
                    )
                    .font(
                        .headline
                    )
                }


                ProgressView(
                    value:
                        progressValue(
                            context.state.progress
                        )
                )


                HStack {

                    Text(
                        "\(context.state.completed) من \(context.state.total)"
                    )
                    .font(
                        .subheadline
                    )


                    Spacer()


                    Text(
                        remainingText(
                            completed:
                                context.state.completed,

                            total:
                                context.state.total
                        )
                    )
                    .font(
                        .caption
                    )
                    .foregroundStyle(
                        .secondary
                    )
                }
            }
            .padding()
            .activityBackgroundTint(
                Color.white
            )
            .activitySystemActionForegroundColor(
                Color.black
            )


        } dynamicIsland: { context in

            /*
             =====================================
             DYNAMIC ISLAND
             =====================================
            */

            DynamicIsland {

                /*
                 EXPANDED - LEADING
                */
                DynamicIslandExpandedRegion(
                    .leading
                ) {

                    VStack(
                        alignment: .leading,
                        spacing: 4
                    ) {

                        Text("🌅")
                            .font(
                                .title2
                            )

                        Text(
                            context.attributes.title
                        )
                        .font(
                            .caption
                        )
                        .lineLimit(1)
                    }
                }


                /*
                 EXPANDED - TRAILING
                */
                DynamicIslandExpandedRegion(
                    .trailing
                ) {

                    Text(
                        "\(Int(context.state.progress))%"
                    )
                    .font(
                        .title3
                        .bold()
                    )
                }


                /*
                 EXPANDED - CENTER
                */
                DynamicIslandExpandedRegion(
                    .center
                ) {

                    Text(
                        "\(context.state.completed) / \(context.state.total)"
                    )
                    .font(
                        .caption
                        .bold()
                    )
                }


                /*
                 EXPANDED - BOTTOM
                */
                DynamicIslandExpandedRegion(
                    .bottom
                ) {

                    VStack(
                        spacing: 8
                    ) {

                        ProgressView(
                            value:
                                progressValue(
                                    context.state.progress
                                )
                        )


                        HStack {

                            Text(
                                remainingText(
                                    completed:
                                        context.state.completed,

                                    total:
                                        context.state.total
                                )
                            )
                            .font(
                                .caption
                            )


                            Spacer()


                            Text(
                                "متابعة الأذكار"
                            )
                            .font(
                                .caption
                                .bold()
                            )
                        }
                    }
                }

            } compactLeading: {

                /*
                 =====================================
                 COMPACT LEFT
                 =====================================
                */

                Text("🌅")
                    .accessibilityLabel(
                        "أذكار الصباح"
                    )


            } compactTrailing: {

                /*
                 =====================================
                 COMPACT RIGHT
                 =====================================
                */

                Text(
                    "\(Int(context.state.progress))%"
                )
                .font(
                    .caption2
                    .bold()
                )
                .monospacedDigit()
                .accessibilityLabel(
                    "نسبة الإنجاز \(Int(context.state.progress)) بالمئة"
                )


            } minimal: {

                /*
                 =====================================
                 MINIMAL
                 =====================================
                */

                ZStack {

                    Circle()
                        .stroke(
                            .secondary
                            .opacity(0.3),

                            lineWidth: 3
                        )


                    Circle()
                        .trim(
                            from: 0,

                            to:
                                progressValue(
                                    context.state.progress
                                )
                        )
                        .stroke(
                            .primary,

                            style:
                                StrokeStyle(
                                    lineWidth: 3,

                                    lineCap:
                                        .round
                                )
                        )
                        .rotationEffect(
                            .degrees(-90)
                        )


                    Text("🌅")
                        .font(
                            .system(
                                size: 10
                            )
                        )
                }
                .accessibilityLabel(
                    "أذكار الصباح \(Int(context.state.progress)) بالمئة"
                )
            }
        }
    }


    /* =====================================
       PROGRESS
    ===================================== */

    private func progressValue(
        _ progress: Double
    ) -> Double {

        let value =
            progress / 100


        return min(
            max(
                value,
                0
            ),
            1
        )
    }


    /* =====================================
       REMAINING TEXT
    ===================================== */

    private func remainingText(
        completed: Int,
        total: Int
    ) -> String {

        let remaining =
            max(
                total - completed,
                0
            )


        if remaining == 0 {
            return "اكتمل وردك 🤍"
        }


        return "بقي \(remaining)"
    }
}